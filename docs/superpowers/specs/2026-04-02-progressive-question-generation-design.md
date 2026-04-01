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
| `pages/index/index.wxss` | 删除 .generate-duck 和 .loading-mask 相关样式 |
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

`parseResponse` 后执行去重检查：

1. 将返回题目的 content 去除空格后与 `existingQuestions` 逐一比对
2. 如果重复，自动重试一次（在 prompt 中追加「必须和以下题目不同」）
3. 重试后仍重复，返回结果并附加 `duplicateWarning: true`，让前端决定

最多重试 1 次，不做无限重试。

#### 1.4 安全检查调整（security.js）

- 新增 `sessionId` 参数校验
- 同一 `sessionId` 内的调用不触发 openid 级别的频率限制
- 不同 `sessionId` 之间仍保持原有限制（10 秒间隔）
- `sessionId` 格式校验：`sess_` 前缀 + 时间戳 + 随机串，防伪造

### 2. 前端 index 页改造

#### 2.1 handleGenerate 简化

```
handleGenerate:
  1. 参数校验、频率限制检查（不变）
  2. setData({ generating: true })
  3. 生成 sessionId = `sess_${Date.now()}_${随机6位}`
  4. 调云函数 count=1（无 existingQuestions）
  5. 拿到第 1 题后：
     app.globalData.currentQuestions = {
       questions: [第1题],
       knowledge: selectedKnowledge,
       meta: result.meta,
       generateParams: {
         knowledgeId, knowledgeName, grade,
         difficulty, questionType,
         targetCount: selectedCount,
         sessionId
       }
     }
  6. wx.navigateTo practice 页
  7. finally: setData({ generating: false })
```

#### 2.2 模板改动（index.wxml）

- 删除按钮内 `<image class="generate-duck">` 元素
- 删除 `<view class="loading-mask">` 整块（全屏加载遮罩）

#### 2.3 样式清理（index.wxss）

- 删除 `.generate-duck` 相关样式
- 删除 `.loading-mask`、`.loading-box`、`.loading-spinner`、`.loading-text`、`.loading-sub` 相关样式

### 3. 前端 practice 页改造（核心）

#### 3.1 新增 data 字段

| 字段 | 类型 | 初始值 | 说明 |
|------|------|--------|------|
| `questionQueue` | Array | [] | 已生成但未展示的题目缓冲 |
| `generatedCount` | Number | 0 | 已成功生成的总题数 |
| `targetCount` | Number | 0 | 用户选的目标题数 |
| `pendingRequests` | Number | 0 | 飞行中的云函数请求数 |
| `allExistingContents` | Array | [] | 所有已生成题目的 content，传给云函数去重 |
| `waitingForNext` | Boolean | false | 用户答完了但下一题还没好 |
| `generateParams` | Object | null | 生成参数（知识点、难度等） |
| `destroyed` | Boolean | false | 页面是否已卸载 |

#### 3.2 预取调度器 prefetchQuestions()

```
prefetchQuestions():
  1. 计算 remainingToGenerate = targetCount - generatedCount - pendingRequests
  2. 如果 remainingToGenerate <= 0，不做任何事
  3. 计算 buffer = questionQueue.length + pendingRequests
  4. 如果 buffer >= 2，不做任何事（缓冲充足）
  5. 需要发起的请求数 = min(2 - buffer, remainingToGenerate)
  6. 发起 N 个并行的云函数调用，每个 count=1
  7. pendingRequests += N
```

#### 3.3 云函数回调处理 onQuestionGenerated(result)

```
onQuestionGenerated(result):
  1. if (this.destroyed) return  // 页面已退出
  2. pendingRequests--
  3. if (result.success):
     a. 格式化题目（复用现有 formatQuestion 逻辑）
     b. 加入 questionQueue
     c. 更新 allExistingContents、generatedCount
     d. if (waitingForNext): 取队列头展示，清除等待态
     e. 调用 prefetchQuestions() 补充缓冲
  4. if (!result.success):
     a. 重试 1 次
     b. 仍失败则记录错误，如果连续 2 题失败则停止预取
     c. 如果 waitingForNext 且无更多请求在飞行：以当前题目数结束
```

#### 3.4 handleNext 改造

```
handleNext (用户点「下一题」):
  1. 记录答题（不变）
  2. if (currentIndex + 1 >= 实际已有总题数 且 无更多题目要生成):
     跳转结果页（不变）
  3. else if (questionQueue.length > 0):
     取 questionQueue 头部，设为 currentQuestion
     调用 prefetchQuestions() 补充缓冲
  4. else:
     setData({ waitingForNext: true })
     // 等 onQuestionGenerated 回调自动展示
```

#### 3.5 等待态 UI（practice.wxml）

在题目卡片区域，当 `waitingForNext=true` 时显示：

```html
<view class="waiting-card" wx:if="{{waitingForNext}}">
  <image class="waiting-duck" src="/images/duck-avatar.png" mode="aspectFit"></image>
  <text class="waiting-text">下一题准备中...</text>
</view>
```

样式：居中对齐，和题目卡片相同尺寸和圆角，背景柔和，不阻断页面。

#### 3.6 totalQuestions 动态更新

- 进度条的「共 N 题」在全部生成完成前显示 `targetCount`
- 如果因错误减少了实际题数，同步更新 `totalQuestions` 和进度条

#### 3.7 页面退出清理（onUnload）

```
onUnload:
  1. this.destroyed = true
  2. 清除 countdownTimer（已有）
  // 飞行中的请求回调会检查 destroyed 标志自动丢弃
```

### 4. 错误处理汇总

| 场景 | 处理策略 |
|------|----------|
| 首题生成失败（index 页） | 弹窗提示（现有逻辑不变） |
| 后台某题生成失败 | 自动重试 1 次，仍失败则跳过，减少 targetCount |
| 连续 2 题后台失败 | 停止预取，Toast「部分题目生成失败」，用已有题继续 |
| 用户等待中且失败 | 有飞行请求则继续等；无则提示并以当前题数结束 |
| 去重重试后仍重复 | 接受该题目（实际概率极低） |
| 页面退出后回调到达 | 检查 destroyed 标志，丢弃结果 |

### 5. 性能预期

| 指标 | 改造前 | 改造后 |
|------|--------|--------|
| 点击到看到第 1 题 | 5-20 秒（取决于题数） | 1-3 秒（固定 1 题） |
| 答完到看到下一题 | 0 秒（已全部加载） | 0 秒（双缓冲预取）或 1-3 秒（极端情况） |
| 云函数单次 max_tokens | 800 | 300（单题模式） |
| 用户感知等待 | 每次练习等一次长时间 | 几乎无感知 |
