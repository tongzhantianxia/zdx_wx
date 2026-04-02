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
4. 题库用尽时自动 fallback 到 AI 实时生成，生成结果回填入库
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
  "type": "calculation",
  "difficulty": "medium",
  "content": "图书馆购进了 36 本故事书...",
  "answer": "9",
  "solution": "解题步骤...",
  "tip": "易错提示...",
  "source": "rewritten_exam",
  "createdAt": "2026-04-02T10:00:00Z"
}
```

**索引：**
- `{ knowledgeId: 1, difficulty: 1 }` — 主查询路径
- `{ source: 1 }` — 按来源统计

**`source` 枚举：**

| 值 | 含义 |
|----|------|
| `rewritten_exam` | 基于公开真题 AI 改写 |
| `ai_realtime` | 用户使用时 AI 实时生成并回填 |
| `public_exam` | 手动补充的公开原始真题 |

### 集合 `user_question_log`

```json
{
  "_id": "自动生成",
  "openid": "用户openid",
  "questionId": "question_bank._id",
  "knowledgeId": "g5u-3-2",
  "answeredAt": "2026-04-02T10:30:00Z",
  "isCorrect": true
}
```

**索引：**
- `{ openid: 1, knowledgeId: 1, answeredAt: -1 }` — 去重查询

## 出题流程

```
用户选择知识点 + 题量(N)
        │
        ▼
  云函数 getQuestions
        │
        ▼
  ① 查 user_question_log（openid + knowledgeId + 近30天）→ doneIds[]
  ② 查 question_bank（knowledgeId + difficulty）→ 排除 doneIds → 可用题
        │
        ▼
    可用题 >= N？
    ├── 是 → 随机取 N 题返回
    └── 否 → 取出所有可用题(M题)
              + 调 generateQuestions 补 (N-M) 题
              + AI 生成的题回写 question_bank（source: ai_realtime）
              → 合并返回 N 题
        │
        ▼
  ③ 批量写入 user_question_log
  ④ 返回统一格式题目数组
```

**关键决策：**
- 新建云函数 `getQuestions`，不改造现有 `generateQuestions`
- `generateQuestions` 保持纯 AI 调用，作为 fallback 被 `getQuestions` 内部调用
- AI 实时生成的题自动回填入库，题库越用越大
- 前端只需改调用入口（`generateQuestions` → `getQuestions`），返回结构不变

**渐进出题兼容：**
当前 progressive 模式每次 `count: 1`，`getQuestions` 同样支持，逻辑完全兼容。`sessionId` 和 `existingQuestions` 参数透传给 `generateQuestions`（仅在 fallback 时使用）。

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

- 目标：公开免费教育资源网站（国家教育资源公共服务平台等）
- 按 `knowledgeData.js` 的 249 个知识点分类爬取
- 每个知识点目标 30-50 题
- 输出：`raw_questions/{knowledgeId}.json`，含原始题目、答案、来源 URL

### 改写阶段 (`rewrite.js`)

- 对每道原题调用大模型改写
- 改写规则：
  - 保留：知识点、题型、难度、解题逻辑
  - 替换：数值、人名、物品、情境场景
  - 不能仅替换数字，必须变换情境
- 改写后自动验算：
  - 计算题：程序验算
  - 应用题/填空题：AI 二次校验
  - 验算失败的标记 `failed`，不入库
- 输出：`rewritten_questions/{knowledgeId}.json`

### 导入阶段 (`import.js`)

- 读取 `rewritten_questions/*.json`
- 批量写入云数据库 `question_bank`
- 记录导入统计（成功/失败/跳过）

### 断点续跑

`progress.json` 记录每个知识点的处理状态（crawled / rewritten / imported），脚本启动时自动跳过已完成的。

## 前端改动

### `pages/index/index.js`

`handleGenerate` 方法中：
- `wx.cloud.callFunction({ name: 'generateQuestions', ... })` 改为 `wx.cloud.callFunction({ name: 'getQuestions', ... })`
- 参数结构不变
- 返回结构不变

### `pages/practice/practice.js`

- `prefetchQuestions` 中的云函数调用同样改为 `getQuestions`
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
      "tip": "..."
    }
  ],
  "meta": {
    "knowledgeId": "g5u-3-2",
    "knowledgeName": "除数是小数的小数除法",
    "grade": "五年级",
    "count": 1,
    "source": "question_bank",
    "generatedAt": "2026-04-02T10:00:00Z"
  }
}
```

`meta.source` 标识本次出题来源：`question_bank`（题库）或 `ai_generated`（AI fallback）。

## 容量估算

- 249 个知识点 × 30 题/知识点 = 约 7,500 条
- 单条约 500 字节 → 总计约 3.75 MB
- 微信云开发免费配额：数据库存储 2GB，完全足够
- `user_question_log` 按活跃用户估算，增长可控

## 风险和缓解

| 风险 | 缓解 |
|------|------|
| 公开网站反爬 | 添加延时、User-Agent 轮换，做好断点续跑 |
| AI 改写质量不稳定 | 自动验算 + 人工抽检，验算不通过不入库 |
| 云数据库查询性能 | 建好索引，单次查询量小（30天去重 + 随机取题） |
| 题库初始填充时间 | 离线脚本，可分批运行，不影响线上 |
