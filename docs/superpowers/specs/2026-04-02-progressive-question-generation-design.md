# 渐进式出题设计文档

## 问题

当前点击「生成练习题」后，云函数一次性调用 DeepSeek 生成所有题目（3-10 题），全部完成后才跳转练习页。DeepSeek 响应慢，用户等待时间长（5-20 秒），体验差。

## 目标

1. 点击出题后只生成 1 题，拿到即跳转，用户感知等待缩短到 1-3 秒
2. 后续题目在用户答题过程中后台逐题预取，双缓冲策略消除等待感
3. 后端去重校验，避免重复出题
4. 去掉出题按钮右侧的鸭子图标
5. 去掉全屏加载遮罩（单题生成足够快，按钮 loading 态即可）

## 方案选择

**方案 A（采用）：前端轮询调度** — 前端作为调度中心，逐次调用云函数生成单题，管理题目队列和预取逻辑。

淘汰方案：
- 方案 B（云函数流式分批返回）：依赖云数据库 watcher，实现复杂，云函数可能超时
- 方案 C（首题快速 + 剩余批量）：第二次批量请求仍然慢，体验改善有限

## 架构设计

### 端到端流程

```
用户点击「生成练习题」（选了 5 题）
    │
    ├─ 前端调云函数 count=1 → 拿到第 1 题
    │   └─ 立即跳转 practice 页，显示第 1 题
    │
    ├─ practice 页 onLoad 立即预取第 2、3 题（双缓冲）
    │   ├─ 调云函数 count=1, existingQuestions=["第1题content"]
    │   └─ 调云函数 count=1, existingQuestions=["第1题content"]
    │
    ├─ 用户答第 1 题 → 从队列取第 2 题显示
    │   └─ 触发预取第 4 题（保持 2 题缓冲）
    │
    ├─ 用户答第 2 题 → 从队列取第 3 题显示
    │   └─ 触发预取第 5 题
    │
    └─ ... 直到所有题目生成完毕
```

### 涉及文件

| 文件 | 改动类型 |
|------|----------|
| `pages/index/index.js` | 简化 handleGenerate，传 count=1，新增 generateParams |
| `pages/index/index.wxml` | 删除鸭子图标、删除全屏加载遮罩 |
| `pages/index/index.wxss` | 删除 `.generate-duck`、`.loading-mask`、`.loading-box`、`.loading-text`、`.loading-sub` 样式 |
| `pages/practice/practice.js` | 新增预取调度器、题目队列、等待态逻辑 |
| `pages/practice/practice.wxml` | 新增等待态 UI |
| `pages/practice/practice.wxss` | 新增等待态样式 |
| `cloudfunctions/generateQuestions/index.js` | 支持 existingQuestions 去重、单题 max_tokens 优化 |
| `cloudfunctions/generateQuestions/security.js` | 支持 sessionId 同练习内不限频 |

---

## 详细设计

### 1. 云函数改造（generateQuestions）

#### 1.1 新增入参

```json
{
  "knowledgeId": "...",
  "knowledgeName": "小数乘法",
  "grade": "五年级",
  "count": 1,
  "difficulty": "medium",
  "questionType": "calculation",
  "existingQuestions": ["3.5 × 2.4 = ?", "12.6 ÷ 3 = ?"],
  "sessionId": "sess_1712025600_abc123"
}
```

- `existingQuestions`：已出过的题目 content 数组，用于去重。首次调用时为空数组。
- `sessionId`：标识同一次练习，同 sessionId 内的调用不触发频率限制。

#### 1.2 Prompt 改造

当 `existingQuestions` 非空时，在 `buildUserPrompt` 返回的 prompt 末尾追加：

```
已出过的题（不要重复）：3.5 × 2.4 = ?、12.6 ÷ 3 = ?
```

当 `count=1` 时，`max_tokens` 从 800 降到 300，减少 DeepSeek 生成时间。

#### 1.3 后端去重校验

`parseResponse` 拿到题目后，与 `existingQuestions` 做内容比对：

1. 将返回题目的 content 去除空格后与 `existingQuestions` 各项去除空格后逐一比对
2. 如果重复，自动重试一次（在 prompt 中追加「必须和以下题目不同」）
3. 重试后仍重复，返回结果并附加 `duplicateWarning: true`，让前端接受（实际概率极低）

最多重试 1 次，不做无限重试。

#### 1.4 安全检查调整（security.js）

**sessionId 频率限制豁免：**

- `performSecurityCheck` 接收 `sessionId` 参数
- 当 `sessionId` 存在且合法时，跳过 `checkRateLimit`，改为按 sessionId 限制总调用次数
- sessionId 格式校验：必须匹配 `sess_` 前缀 + 13位时间戳 + `_` + 6位随机串（正则 `/^sess_\d{13}_[a-z0-9]{6}$/`）
- 服务端维护 sessionId → callCount 的内存计数器（与现有 rateLimitCache 同级）
- 每个 sessionId 最多允许 `targetCount + 2` 次调用（targetCount 由首次调用传入，+2 为去重重试余量），超出则返回 RATE_LIMITED
- sessionId 计数器 5 分钟后自动过期清理

**新增 existingQuestions 参数校验（在 validateParams 中）：**

- `existingQuestions` 必须是数组，最大长度 10
- 数组中每项必须是字符串，单项最大长度 200 字符
- 超出限制则截断（不拒绝请求），防止恶意膨胀 prompt

**新增 sessionId 参数校验（在 validateParams 中）：**

- `sessionId` 可选。传入时必须匹配上述正则格式
- 格式不合法则忽略（fallback 到原有频率限制逻辑）

#### 1.5 不变的部分

- `callDeepSeekAPI` 的重试逻辑、超时配置不变
- 返回格式不变：`{ success, questions: [单题], meta }`
- `DEEPSEEK_HOST`、`DEEPSEEK_PATH` 等配置不变

### 2. 前端 index 页改造

#### 2.1 handleGenerate 简化

```
handleGenerate:
  1. 参数校验、频率限制检查（不变）
  2. setData({ generating: true })
  3. 生成 sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  4. 调云函数：count=1, existingQuestions=[], sessionId
     注意：grade 仍然硬编码为 '五年级'（与当前行为一致）
     difficulty 从 this.data.selectedDifficulty 读取（当前固定为 'medium'）
     questionType 固定为 'calculation'（与当前行为一致）
  5. 拿到第 1 题后：
     app.globalData.currentQuestions = {
       questions: [第1题],
       knowledge: selectedKnowledge,
       meta: result.meta,
       generateParams: {
         knowledgeId, knowledgeName,
         grade: '五年级',
         difficulty: selectedDifficulty,
         questionType: 'calculation',
         targetCount: selectedCount,
         sessionId
       }
     }
  6. wx.navigateTo practice 页
  7. finally: setData({ generating: false })
```

#### 2.2 模板改动（index.wxml）

- 删除按钮内 `<image wx:if="{{!generating}}" class="generate-duck" ...>` 元素
- 删除 `<view class="loading-mask" wx:if="{{generating}}">` 整块（全屏加载遮罩）

#### 2.3 样式清理（index.wxss）

删除以下样式规则：
- `.generate-duck`（第 457-463 行）
- `.loading-mask`（第 466-474 行）
- `.loading-box`（第 476-484 行）
- `.loading-text`（第 486-491 行）
- `.loading-sub`（第 493-497 行）

注意：wxss 中不存在 `.loading-spinner` 样式，无需删除。wxml 中的 `<view class="loading-spinner">` 会随整个 loading-mask 块一起删除。

### 3. 前端 practice 页改造（核心）

#### 3.1 新增数据与状态

**data 字段（驱动 UI 渲染）：**

| 字段 | 类型 | 初始值 | 说明 |
|------|------|--------|------|
| `waitingForNext` | Boolean | false | 用户答完了但下一题还没好，显示等待 UI |

**实例属性（this.xxx，不放 data 中，仅内部逻辑用）：**

| 属性 | 类型 | 初始值 | 说明 |
|------|------|--------|------|
| `questionQueue` | Array | [] | 已生成但未展示的题目缓冲 |
| `generatedCount` | Number | 0 | 已成功生成的总题数（含首题） |
| `targetCount` | Number | 0 | 用户选的目标题数 |
| `pendingRequests` | Number | 0 | 飞行中的云函数请求数 |
| `allExistingContents` | Array | [] | 所有已生成题目的 content，传给云函数去重 |
| `generateParams` | Object | null | 生成参数（知识点、难度等） |
| `destroyed` | Boolean | false | 页面是否已卸载 |
| `consecutiveFailures` | Number | 0 | 连续失败计数器 |

`destroyed` 使用 `this.destroyed`（实例属性），不通过 setData，因为它不驱动 UI 且需要在异步回调中同步读取。

#### 3.2 onLoad 改造

```
onLoad(options):
  if (source === 'generated' && app.globalData.currentQuestions):
    1. 读取 questions[0] 作为首题，设为 currentQuestion
    2. 读取 generateParams，存入 this.generateParams
    3. this.targetCount = generateParams.targetCount
    4. this.generatedCount = 1（首题已有）
    5. this.allExistingContents = [questions[0].content]
    6. 将首题加入 this.data.questions 数组（保持与现有 questions 数组兼容）
    7. setData({ totalQuestions: targetCount })
    8. 调用 this.prefetchQuestions()
  else:
    保持原有逻辑不变
```

#### 3.3 题目格式化

复用 `loadQuestionsFromData` 中现有的内联格式化逻辑（practice.js 第 56-66 行），将云函数返回的单题转换为 practice 页使用的格式：

```javascript
const formatSingleQuestion = (q) => ({
  id: q.id || Date.now() + Math.random(),
  question: q.content,
  answer: q.answer,
  type: q.type || '计算题',
  typeName: q.type || '计算题',
  difficulty: this.getDifficultyLevel(q.difficulty),
  difficultyText: q.difficulty || '中等',
  hint: q.tip || '',
  explanation: q.solution || ''
});
```

提取为独立方法，供 `loadQuestionsFromData` 和预取回调共用。

#### 3.4 预取调度器 prefetchQuestions()

```
prefetchQuestions():
  1. 如果 this.destroyed，return
  2. remainingToGenerate = targetCount - generatedCount - pendingRequests
  3. 如果 remainingToGenerate <= 0，return
  4. buffer = questionQueue.length + pendingRequests
  5. 如果 buffer >= 2，return（缓冲充足）
  6. needed = Math.max(0, Math.min(2 - buffer, remainingToGenerate))
  7. 如果 needed <= 0，return
  8. 发起 needed 个并行的云函数调用：
     每个调用传入不同的 hint 后缀（如 "请确保题目有新意，序号N"）以鼓励多样性
     count=1, existingQuestions=this.allExistingContents 的副本, sessionId
  9. this.pendingRequests += needed
```

关于并行请求可能返回相同题目的问题：两个同时发出的请求携带相同的 `existingQuestions`，无法互相感知。为降低重复概率：
- 每个并行请求在 prompt 中追加一个不同的随机种子提示（如「序号2」「序号3」）
- 如果仍然重复，前端在回调中做二次去重（比对 allExistingContents），重复则丢弃并补发一个新请求

#### 3.5 云函数回调处理 onQuestionGenerated(result)

```
onQuestionGenerated(result):
  1. if (this.destroyed) return
  2. this.pendingRequests--
  3. if (result.success):
     a. formatted = this.formatSingleQuestion(result.questions[0])
     b. 前端二次去重：检查 formatted.question 是否已在 allExistingContents 中
        - 如果重复：丢弃，调用 prefetchQuestions() 补发，return
     c. this.allExistingContents.push(result.questions[0].content)
     d. this.generatedCount++
     e. this.consecutiveFailures = 0
     f. 将 formatted 追加到 this.data.questions 数组（通过 setData）
        这保证 questions 数组始终包含所有已展示+待展示的题，与 goToResult、answers 等逻辑兼容
     g. this.questionQueue.push(formatted)
     h. if (this.data.waitingForNext):
        取 questionQueue 头部展示（见 showNextFromQueue）
     i. 调用 prefetchQuestions() 补充缓冲
  4. if (!result.success):
     a. this.consecutiveFailures++
     b. if (consecutiveFailures < 2):
        调用 prefetchQuestions()（会自动补发）
     c. if (consecutiveFailures >= 2):
        停止预取
        更新 targetCount 为 generatedCount（以已有题目数结束）
        setData({ totalQuestions: generatedCount })
        Toast '部分题目生成失败'
        if (waitingForNext): 以当前题目数结束练习（goToResult 或提示）
```

#### 3.6 handleNext 改造

```
handleNext:
  1. 记录答题、保存记录、错题处理（不变）
  2. setData({ showFeedback: false, showHint: false, userAnswer: '' })
  3. newIndex = currentIndex + 1
  4. 判断是否结束：
     a. 如果 newIndex >= generatedCount 且 pendingRequests === 0 且 questionQueue.length === 0:
        练习结束，goToResult()
     b. 否则如果 questionQueue.length > 0:
        showNextFromQueue()
        调用 prefetchQuestions() 补充缓冲
     c. 否则（下一题还没好）:
        setData({ waitingForNext: true, currentIndex: newIndex })
        // 等 onQuestionGenerated 回调自动展示
```

#### 3.7 showNextFromQueue()

```
showNextFromQueue():
  1. question = this.questionQueue.shift()
  2. newIndex = this.data.currentIndex + (this.data.waitingForNext ? 0 : 1)
     // 如果是从等待态恢复，currentIndex 已经在 handleNext 中递增过
  3. setData({
       currentQuestion: question,
       currentIndex: newIndex,
       progressPercent: ((newIndex + 1) / totalQuestions) * 100,
       waitingForNext: false
     })
```

#### 3.8 等待态 UI（practice.wxml）

在题目卡片区域，当 `waitingForNext=true` 时替代显示：

```html
<view class="waiting-card" wx:if="{{waitingForNext}}">
  <image class="waiting-duck" src="/images/duck-avatar.png" mode="aspectFit"></image>
  <text class="waiting-text">下一题准备中...</text>
</view>
```

样式：居中对齐，和题目卡片相同尺寸和圆角，背景柔和，不阻断页面。

#### 3.9 totalQuestions 与进度条

- 进度条的「共 N 题」初始显示 `targetCount`
- `currentIndex` 正常递增（0, 1, 2, ...），每展示一题加 1
- 所有生成的题目都追加到 `this.data.questions` 数组，保证 `questions[currentIndex]` 有效
- 如果因错误减少了实际题数（3.5 节中 consecutiveFailures >= 2 的情况），同步更新 `totalQuestions`

#### 3.10 页面退出清理（onUnload）

```
onUnload:
  1. this.destroyed = true
  2. 清除现有的 UI 定时器（如果有）
  // 飞行中的请求回调检查 this.destroyed，已退出则丢弃结果
  // 无需主动取消云函数调用（微信不支持）
```

同时，清理 `app.globalData.currentQuestions`（设为 null），防止用户返回 index 页后再次进入时读到上一次的过期数据。

#### 3.11 不变的部分

- 答题（handleSubmit）、判分（checkAnswer）、提示、反馈弹层逻辑不变
- 错题记录（addToWrongQuestions）、答题记录保存（saveAnswerRecord）不变
- 结果页跳转逻辑（goToResult）不变——它读取 `this.data.answers` 和 `totalQuestions`，这两个字段在新设计中含义不变
- 从数据库加载题目（loadQuestions）的分支不变

### 4. 错误处理汇总

| 场景 | 处理策略 |
|------|----------|
| 首题生成失败（index 页） | 弹窗提示（现有逻辑不变） |
| 后台某题生成失败 | consecutiveFailures++，调用 prefetchQuestions 自动补发 |
| 连续 2 个题目生成失败（含重试，即 2 次 prefetch 都失败） | 停止预取，Toast「部分题目生成失败」，以已有题目数结束 |
| 某题生成成功 | consecutiveFailures 重置为 0 |
| 用户等待中（waitingForNext）且失败 | 有飞行请求则继续等；无更多请求则以当前题数结束练习 |
| 去重重试后仍重复 | 前端二次去重丢弃，补发新请求 |
| 页面退出后回调到达 | 检查 `this.destroyed`，丢弃结果 |
| 用户返回 index 后重新进入 | globalData.currentQuestions 已在 onUnload 中清空，不会残留 |

### 5. 性能预期

| 指标 | 改造前 | 改造后 |
|------|--------|--------|
| 点击到看到第 1 题 | 5-20 秒（取决于题数） | 1-3 秒（固定 1 题） |
| 答完到看到下一题 | 0 秒（已全部加载） | 0 秒（双缓冲预取）或 1-3 秒（极端情况） |
| 云函数单次 max_tokens | 800 | 300（单题模式） |
| 云函数调用次数 | 1 次 | N 次（N = 题目数 + 可能的去重重试） |
| 用户感知等待 | 每次练习等一次长时间 | 几乎无感知 |
