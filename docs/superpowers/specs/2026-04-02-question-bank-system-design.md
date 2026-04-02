# P2: 题库系统设计

## 背景

出题鸭当前所有题目由 AI 实时生成，存在以下问题：
- 每次出题都要调用大模型，响应慢、成本高
- 无法保证题目质量一致性
- 用户体验依赖网络和模型状态

本设计引入离线题库，优先从题库出题，题库用尽时 fallback 到 AI 实时生成。

## 目标

1. 建立覆盖人教版 1-6 年级 249 个知识点的题库
2. 题目来源：爬取公开真题 → AI 改写（替换数值和情境，保留知识点和题型）
3. 单用户单知识点近 30 天不重复出题
4. 题库用尽时自动 fallback 到 AI 实时生成，生成结果回填入库（标记为未验证）
5. 前端几乎无感知，返回数据结构与现有一致

## 非目标

- 不做付费题库采购
- 不做题目难度自适应（后续迭代）
- 不改变现有练习/结果页面 UI

## 数据模型

### 集合 `question_bank`

```json
{
  "_id": "自动生成",
  "knowledgeId": "g5u-3-2",
  "knowledgeName": "除数是小数的小数除法",
  "grade": "五年级",
  "semester": "上册",
  "unit": 3,
  "questionType": "calculation",
  "difficulty": "medium",
  "content": "图书馆购进了 36 本故事书...",
  "answer": "9",
  "solution": "解题步骤...",
  "tip": "易错提示...",
  "source": "rewritten_exam",
  "verified": true,
  "createdAt": "2026-04-02T10:00:00Z",
  "updatedAt": "2026-04-02T10:00:00Z"
}
```

**字段说明：**
- `questionType`：题型枚举，与前端一致（`calculation` / `fillBlank` / `application`）
- `verified`：是否经过验算确认。离线改写的题为 `true`，AI 实时生成回填的为 `false`
- `unit`：冗余字段，方便按单元筛选，与 `knowledgeId` 前缀一致

**返回给前端时的字段映射：**
- `questionType: "calculation"` → 前端 `type: "计算题"`
- `questionType: "fillBlank"` → 前端 `type: "填空题"`
- `questionType: "application"` → 前端 `type: "应用题"`

转换在 `getQuestions` 云函数中完成，前端无需处理。

**索引：**
- `{ knowledgeId: 1, difficulty: 1, verified: 1 }` — 主查询路径
- `{ source: 1 }` — 按来源统计

**`source` 枚举：**

| 值 | 含义 |
|----|------|
| `rewritten_exam` | 基于公开真题 AI 改写，已验算 |
| `ai_realtime` | 用户使用时 AI 实时生成并回填，未验算 |
| `public_exam` | 手动补充的公开原始真题 |

### 集合 `user_question_log`

记录用户做题历史，分两阶段写入：

```json
{
  "_id": "自动生成",
  "openid": "用户openid",
  "questionId": "question_bank._id 或 null（AI实时题）",
  "knowledgeId": "g5u-3-2",
  "servedAt": "2026-04-02T10:30:00Z",
  "answeredAt": null,
  "isCorrect": null
}
```

**写入时机：**
1. **出题时**（`getQuestions` 返回题目时）：写入 `openid`、`questionId`、`knowledgeId`、`servedAt`，`answeredAt` 和 `isCorrect` 为 `null`
2. **答题后**（`practice.js` 提交答案时）：更新 `answeredAt` 和 `isCorrect`

**去重仅依赖 `servedAt`**（出题时间），不依赖 `answeredAt`，避免未答题的题目下次重复出现。

**索引：**
- `{ openid: 1, knowledgeId: 1, servedAt: -1 }` — 去重查询

### 集合 `user_knowledge_done`（去重辅助）

为解决云数据库单次查询 100 条上限问题，用一张辅助表存储去重 ID 集合：

```json
{
  "_id": "自动生成",
  "openid": "用户openid",
  "knowledgeId": "g5u-3-2",
  "doneQuestionIds": ["id1", "id2", "id3", "..."],
  "lastUpdated": "2026-04-02T10:30:00Z"
}
```

**机制：**
- 每次出题时，将返回的题目 ID `push` 到 `doneQuestionIds` 数组
- 查询去重时直接取这个数组，一次查询即可，无分页问题
- 定期清理：30 天前的记录通过对比 `user_question_log.servedAt` 移除过期 ID

**索引：**
- `{ openid: 1, knowledgeId: 1 }` — 唯一查询路径

## 出题流程

```
用户选择知识点 + 题量(N)
        │
        ▼
  云函数 getQuestions
        │
        ▼
  ① 查 user_knowledge_done（openid + knowledgeId）→ doneIds[]
  ② 查 question_bank（knowledgeId）→ 排除 doneIds → 可用题
     优先级：verified: true 优先；difficulty 匹配优先，无匹配则放宽难度
        │
        ▼
    可用题 >= N？
    ├── 是 → aggregate $sample 随机取 N 题
    └── 否 → 取全部可用题(M题)
              + 内部调用 generateQuestions 补 (N-M) 题
              + AI 生成的题回写 question_bank（source: ai_realtime, verified: false）
              → 合并返回 N 题
        │
        ▼
  ③ 写 user_question_log（servedAt, isCorrect: null）
  ④ 更新 user_knowledge_done.doneQuestionIds（push 新 ID）
  ⑤ 返回统一格式题目数组（questionType 已转为中文 type）
```

**难度降级策略：**
当指定难度的题库不足时，按以下顺序降级：
1. 先查指定难度（如 `medium`）
2. 不够则扩展到相邻难度（`easy` + `medium` 或 `medium` + `hard`）
3. 仍不够则 AI fallback

**随机取题算法：**
使用云数据库 `aggregate` 的 `$sample` 阶段，一次聚合完成过滤 + 随机 + 取样，避免全量查询。

## 安全模型

`getQuestions` 复用现有 `security.js` 的安全检查逻辑：

1. **鉴权**：复用 `checkAuth`，从 `wxContext` 获取 `openid`
2. **参数校验**：复用 `validateParams`，校验 `knowledgeId`、`count` 等
3. **频率限制**：
   - 题库出题：不触发 AI 频率限制（数据库查询无需限频）
   - AI fallback：内部调用 `generateQuestions` 时跳过重复鉴权（内部调用传入 `_internal: true` 标志），但保留 session 限制
4. **sessionId 处理**：透传给 `generateQuestions`，仅在 AI fallback 时生效

### `generateQuestions` 内部调用适配

新增一个判断：当 `event._internal === true` 时，跳过 `checkAuth` 和 `checkRateLimit`（因为调用方 `getQuestions` 已经做过了），仅保留参数校验和 session 限制。

## 渐进出题兼容

当前 progressive 模式流程：
1. 首次调用 `count: 1`，得到第 1 题
2. 用户答题时，后台预取下一题（`count: 1` + `existingQuestions: [第1题内容]`）

改造后：
1. 首次调用 `getQuestions`（`count: 1`）→ 返回题库题或 AI 题
2. 预取时再次调用 `getQuestions`（`count: 1`）→ `user_knowledge_done` 已包含上一题 ID，自动不重复
3. **`existingQuestions` 仅在 AI fallback 时使用**：传给 `generateQuestions` 做文本去重，题库题不需要

**混合场景**：一次练习中可能前几题来自题库、后几题来自 AI。对前端完全透明，数据格式一致。

## 题库填充：爬虫 + AI 改写

### 工具脚本目录

```
scripts/
├── crawl.js          # 爬取公开题目 → raw_questions/*.json
├── rewrite.js        # AI 改写 + 验算 → rewritten_questions/*.json
├── import.js         # 批量导入云数据库
├── config.js         # 目标网站配置、API Key
└── progress.json     # 断点续跑进度记录
```

### 爬取阶段 (`crawl.js`)

**目标网站（`config.js` 中配置）：**
- 国家教育资源公共服务平台 (ykt.eduyun.cn)
- 学科网免费区 (zxxk.com/soft/free)
- 人教版教材配套练习（公开 PDF 提取）

**爬取规则：**
- 按 `knowledgeData.js` 的 249 个知识点关键词搜索
- 每个知识点目标 30-50 题
- 提取：题目内容、答案、题型、年级/单元、来源 URL
- 请求间隔 2-5 秒随机延时，User-Agent 轮换
- 输出：`raw_questions/{knowledgeId}.json`

### 改写阶段 (`rewrite.js`)

**AI 改写 Prompt 模板：**

```
你是小学数学题改编专家。请改写以下数学题：
- 保留：知识点（{knowledgeName}）、题型（{questionType}）、难度、解题思路
- 必须替换：所有数值、人名、物品名称、生活场景
- 不能仅替换数字，必须变换整个情境
- 重新计算答案并给出完整解题步骤

原题：{originalContent}
原答案：{originalAnswer}

输出JSON：{"content":"改写后的题目","answer":"新答案","solution":"解题步骤","tip":"易错提示"}
```

**验算流程：**
1. 计算题：用 `mathjs` 库程序化验算
2. 应用题/填空题：AI 二次校验（独立调用，prompt 仅含题目和答案，要求验证）
3. 验算失败 → 标记 `failed`，不入库，记录到 `progress.json`

**输出：** `rewritten_questions/{knowledgeId}.json`

### 导入阶段 (`import.js`)

- 读取 `rewritten_questions/*.json`
- 批量写入云数据库 `question_bank`（`verified: true`）
- 记录导入统计：成功 / 失败 / 跳过
- 使用云开发 CLI (`tcb`) 或云函数批量写入

### 断点续跑

`progress.json` 记录每个知识点的处理状态：

```json
{
  "g5u-3-2": { "status": "imported", "crawled": 45, "rewritten": 38, "imported": 38, "failed": 7 },
  "g5u-3-3": { "status": "rewriting", "crawled": 30, "rewritten": 12 }
}
```

## 前端改动

### `pages/index/index.js`

`handleGenerate` 方法中：
- `wx.cloud.callFunction({ name: 'generateQuestions', ... })` 改为 `wx.cloud.callFunction({ name: 'getQuestions', ... })`
- 参数结构不变
- 返回结构不变

### `pages/practice/practice.js`

- `prefetchQuestions` 中的云函数调用同样改为 `getQuestions`
- 答题结束后新增调用：更新 `user_question_log` 的 `answeredAt` 和 `isCorrect`
- 其余逻辑不变

### 其他页面

无改动。

## 云函数 `getQuestions` 接口

### 输入

```json
{
  "knowledgeId": "g5u-3-2",
  "knowledgeName": "除数是小数的小数除法",
  "grade": "五年级",
  "count": 1,
  "targetCount": 5,
  "difficulty": "medium",
  "questionType": "calculation",
  "existingQuestions": [],
  "sessionId": "sess_1712000000000_abc123"
}
```

### 输出（成功）

```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "type": "计算题",
      "content": "...",
      "answer": "...",
      "solution": "...",
      "tip": "...",
      "_bankId": "question_bank._id 或 null"
    }
  ],
  "meta": {
    "knowledgeId": "g5u-3-2",
    "knowledgeName": "除数是小数的小数除法",
    "grade": "五年级",
    "count": 1,
    "sources": ["question_bank"],
    "generatedAt": "2026-04-02T10:00:00Z"
  }
}
```

**`meta.sources`**：数组，标识本批题目的来源。可能值：
- `["question_bank"]` — 全部来自题库
- `["ai_generated"]` — 全部 AI 实时生成
- `["question_bank", "ai_generated"]` — 混合

**`_bankId`**：题库题返回其 `_id`，AI 实时题返回 `null`。前端不使用此字段，仅用于 practice.js 答题后回写 `user_question_log`。

### 输出（失败）

```json
{
  "success": false,
  "error": "错误描述",
  "code": "RATE_LIMITED | INVALID_PARAMS | CONFIG_ERROR | GENERATE_ERROR | UNAUTHORIZED",
  "waitTime": 10
}
```

与现有 `generateQuestions` 错误格式完全一致。

## 容量估算

- 249 个知识点 × 30 题/知识点 = 约 7,500 条
- 单条约 500 字节 → 总计约 3.75 MB
- 微信云开发免费配额：数据库存储 2GB，完全足够
- `user_question_log` 按活跃用户估算，增长可控
- `user_knowledge_done` 每用户每知识点一条，极轻量

## 运维

### 过期数据清理

编写一个定时云函数 `cleanExpiredLogs`（每周执行一次）：
1. 删除 `user_question_log` 中 `servedAt` 超过 30 天的记录
2. 同步清理 `user_knowledge_done.doneQuestionIds` 中对应的过期 ID

### 题库覆盖率监控

编写一个工具云函数 `bankStats`，返回每个知识点的题库数量、已验证数量、AI 回填数量，用于跟踪填充进度。

## 风险和缓解

| 风险 | 缓解 |
|------|------|
| 公开网站反爬 | 请求延时 2-5s、User-Agent 轮换、断点续跑 |
| AI 改写质量不稳定 | 自动验算 + 人工抽检，验算不通过不入库 |
| AI 实时回填质量 | 标记 `verified: false`，出题时优先已验证题目 |
| 云数据库查询 100 条上限 | 使用 `user_knowledge_done` 辅助表避免分页 |
| 题库初始填充时间 | 离线脚本，可分批运行，不影响线上 |
| 30 天 log 数据膨胀 | 定时清理云函数，每周自动清理过期数据 |
