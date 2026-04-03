# OCR 识别 + 加强训练题生成 设计文档

> **日期**: 2026-04-03
> **状态**: 已批准
> **涉及页面**: `pages/improve/`
> **新增云函数**: `ocrRecognize`

---

## 1. 概述

在"提高"页面新增 OCR 拍照识别功能。用户拍摄试卷/作业照片后，系统调用 `qwen3-vl-flash` 多模态模型识别题目，在原图上标注每道题的位置，用户勾选需要加强的题目后，系统自动分析知识点并针对性生成训练题。

### 1.1 核心目标

- 替换现有 `improve` 页面的 mock OCR 逻辑
- 支持整页试卷和局部区域拍照
- OCR 结果以"图片标注 + 列表勾选"联动方式展示
- 根据题目难度自动调整训练题数量
- 复用现有 `getQuestions`/`generateQuestions` 出题流程

### 1.2 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| OCR 模型 | `qwen3-vl-flash` (DashScope) | 免费/低成本多模态模型，与项目已有 DashScope 调用一致 |
| 图片传输 | 云存储中转 | 稳定，图片可留档，无参数大小限制 |
| 出题 | 复用 `getQuestions`/`generateQuestions` | 避免重复建设，与练习页逻辑一致 |

---

## 2. 云函数 `ocrRecognize`

### 2.1 职责

接收图片 fileID，调用 `qwen3-vl-flash` 完成 OCR + 题目拆分 + 知识点匹配，返回结构化结果。

### 2.2 输入

```json
{
  "fileID": "cloud://cloud1-0gfe5z1qae319fb6.xxx/ocr/abc.jpg",
  "grade": "三年级",
  "semester": "upper"
}
```

- `fileID`: 微信云存储文件 ID
- `grade`: 年级（用于约束知识点匹配范围）
- `semester`: 学期 `"upper"` | `"lower"`

### 2.3 处理流程

1. 校验 OPENID（从云函数 context 获取）
2. 频率限制检查（复用 `security.js`，每用户每分钟最多 5 次）
3. `cloud.downloadFile(fileID)` 下载图片
4. 图片转 Base64
5. 构造 `qwen3-vl-flash` 多模态请求，Prompt 要求：
   - 识别图片中所有数学题目
   - 每道题标注：题号、完整内容（含图形的文字化描述）、在图片中的大致位置（top/bottom 百分比）
   - 分析每道题对应的知识点（匹配人教版小学数学体系）
   - 评估难度等级（`easy` / `medium` / `hard`）
6. 解析 AI 返回的 JSON，格式校验
7. 对知识点名称做模糊匹配，关联 `knowledgeData` 中的 `knowledgeId`
8. 返回结构化结果

### 2.4 输出

```json
{
  "success": true,
  "questions": [
    {
      "index": 1,
      "content": "一个长方形的长是8厘米，宽是5厘米，求周长。",
      "position": { "top": 0.05, "bottom": 0.25 },
      "knowledgePoint": "长方形的周长",
      "knowledgeId": "g3u-5-1",
      "knowledgeName": "长方形和正方形的周长",
      "difficulty": "easy",
      "hasGraphic": false,
      "graphicDesc": null
    },
    {
      "index": 2,
      "content": "如图，直角三角形的两条直角边分别是3cm和4cm，求斜边长。",
      "position": { "top": 0.28, "bottom": 0.52 },
      "knowledgePoint": "直角三角形",
      "knowledgeId": null,
      "knowledgeName": null,
      "difficulty": "hard",
      "hasGraphic": true,
      "graphicDesc": "一个直角三角形，底边标注3cm，竖边标注4cm，斜边标注问号"
    }
  ],
  "imageWidth": 750,
  "imageHeight": 1334
}
```

> **知识点 ID 格式**：遵循项目现有格式 `g{年级数字}{u上|l下}-{单元号}-{知识点序号}`，如 `g3u-5-1` 表示三年级上册第 5 单元第 1 个知识点。匹配时参照 `generateQuestions/security.js` 中的 `VALID_KNOWLEDGE_IDS` 白名单和 `utils/knowledgeData.js` 中的知识点树。

### 2.5 Prompt 设计要点

```
你是一个小学数学试卷识别助手。请分析图片中的数学题目，返回 JSON 格式结果。

要求：
1. 识别每道独立的题目，按顺序编号
2. 提取完整题目文本，包含所有条件和问题
3. 如果题目包含图形/图表，用文字详细描述图形内容
4. 标注每道题在图片中的位置（top 和 bottom，0-1 之间的比例值）
5. 分析每道题对应的数学知识点（参考人教版小学{grade}数学）
6. 评估难度：easy（基础计算/概念）、medium（需要多步推理）、hard（综合应用/拓展）

返回格式：
{
  "questions": [
    {
      "index": 题号,
      "content": "完整题目文本",
      "position": { "top": 0.0, "bottom": 0.0 },
      "knowledgePoint": "知识点名称",
      "difficulty": "easy|medium|hard",
      "hasGraphic": true/false,
      "graphicDesc": "图形描述或null"
    }
  ]
}
```

### 2.6 知识点模糊匹配 (`knowledgeMapping.js`)

- 从 `knowledgeData.js` 中提取当前年级+学期的所有知识点，构建 `{ id, name }` 列表
- 对 AI 返回的 `knowledgePoint` 做字符串相似度匹配（包含/被包含/编辑距离）
- 匹配阈值：相似度 > 0.6 才关联
- 匹配成功时同时填充 `knowledgeId`（如 `g3u-5-1`）和 `knowledgeName`（如 `长方形和正方形的周长`），两者都来自 `knowledgeData.js`
- 匹配结果的 `knowledgeId` 须存在于 `VALID_KNOWLEDGE_IDS`（`security.js`）白名单中
- 未匹配时 `knowledgeId` 和 `knowledgeName` 均设为 `null`，不阻断流程
- **云函数部署注意**：`knowledgeData.js` 需拷贝一份到 `ocrRecognize/` 目录下（云函数独立打包，无法 `require` 小程序端 `utils/` 目录的文件）

### 2.7 安全 & 限制

- **频率限制**：`ocrRecognize` 自行实现独立的频率限制（不复用 `generateQuestions/security.js`），采用与 `checkRateLimit` 相同的内存 Map 模式，但间隔设为 **15 秒**（OCR 调用成本高于普通出题）
- 图片大小限制 10MB（云存储层面控制）
- AI 返回 JSON 解析失败时重试 1 次
- 云函数超时设置 60s

### 2.8 文件结构

```
cloudfunctions/ocrRecognize/
  index.js              # 主入口
  config.json           # 云函数配置 { "timeout": 60 }
  package.json          # 依赖 openai
  knowledgeMapping.js   # 知识点模糊匹配工具
  knowledgeData.js      # 从 utils/knowledgeData.js 拷贝（云函数独立打包）
```

---

## 3. 前端"提高"页面交互设计

### 3.1 页面状态

| 状态 | UI 表现 |
|------|---------|
| `idle` | 引导页，显示拍照/相册按钮 |
| `uploading` | 上传中，显示进度条 |
| `analyzing` | AI 识别中，分析动画 |
| `result` | 识别结果展示（图片标注 + 列表勾选） |
| `generating` | 生成训练题中，加载动画 |

### 3.2 识别结果页 (`result` 状态)

#### 上半区 —— 图片标注区

- 展示原图，叠加半透明色块标注每道题的位置
- 未选中：浅灰色半透明遮罩 + 题号标签
- 已选中：主题色 `#FFB300` 半透明高亮 + 题号标签
- 点击题目区域切换选中状态
- 实现方式：`<canvas>` 或 `<view>` 绝对定位叠加在 `<image>` 上

#### 下半区 —— 题目列表区

- 可滚动列表，每道题一张卡片
- 卡片包含：题号、题目文本（截取前两行）、知识点标签、难度标签
- 难度颜色：`easy` 绿色 / `medium` 橙色 / `hard` 红色
- 左侧 checkbox 勾选
- 含图形题显示图标提示
- 点击卡片可展开查看完整题目和图形描述

#### 联动交互

- 图片区点击 ↔ 列表区勾选状态同步
- 列表区勾选时，图片区对应区域高亮闪烁一次

#### 底部固定栏

- 显示"已选 X 题"
- "开始加强训练"按钮（至少选 1 题才可点击）
- "重新拍照"文字按钮

### 3.3 知识点未匹配处理

- `knowledgeId` 为 `null` 时，标签显示 AI 原始知识点名称 + 灰色"未匹配"小标
- 仍可选择，出题时走 `generateQuestions` 纯 AI 生成路径

---

## 4. 加强训练题生成逻辑

### 4.1 难度自适应题量

| 原题难度 | 生成训练题数量 | 理由 |
|---------|-------------|------|
| `easy` | 2 道 | 基础巩固 |
| `medium` | 3 道 | 适量强化 |
| `hard` | 5 道 | 重点攻克 |

### 4.2 调用策略

按知识点分组后并行调用：

**有 `knowledgeId`**：
- 调用 `getQuestions`，传入 `knowledgeId`、`knowledgeName`、`grade`、`count`（`knowledgeName` 为必填参数，否则 `getQuestions` 返回 `INVALID_PARAMS`）
- 走"题库优先 + AI 补充"逻辑

**无 `knowledgeId`**：
- 调用 `generateQuestions`，传入 AI 返回的 `knowledgePoint` 作为 `knowledgeName`（≤50 字符，截断处理）
- 原题内容通过 `prefetchHint` 字段传入（≤80 字符，截断为摘要），作为出题参考上下文
- **注意**：`prefetchHint` 现有限制 80 字符（经 `buildUserPrompt` 拼接），原题过长时只取核心条件部分

**同知识点合并**：多道选中题属于同一 `knowledgeId` 时，合并题量。若合并后超过 10（`count` 上限），拆为多次调用（每次 ≤ 10），通过 `Promise.all` 并行。

### 4.3 结果汇总

- 所有训练题合并为数组，构造 `app.globalData.currentQuestions` 对象，结构与现有 `practice-select` 一致：
  ```json
  {
    "questions": [...],
    "knowledge": { "id": "mixed", "name": "OCR加强训练" },
    "meta": { "questionType": "calculation" }
  }
  ```
- **不传 `generateParams`（无 `targetCount` / `sessionId`）**，避免触发 `practice.js` 的渐进出题分支 `initProgressivePractice`
- 跳转使用 `source=generated`（与 `practice.js` 现有判断逻辑一致：`source === 'generated' && app.globalData.currentQuestions`），**不使用新的 source 值**，无需修改 `practice.js`
- 如需后续统计 OCR 来源，在 `meta` 中附加 `origin: 'ocr_improve'` 字段，`practice.js` 会透传 `meta` 到记录中

### 4.4 并行加载

- 多知识点调用通过 `Promise.all` 并行发起
- 前端显示"正在生成 X 道加强训练题..."
- 单个失败不阻塞其他，跳过并提示
- 全部失败则提示重试，停留结果页

---

## 5. 数据流

```
[小程序端]                              [云端]

wx.chooseMedia (拍照/相册)
    ↓
wx.cloud.uploadFile
    → 云存储 ocr/{openid}/{timestamp}.jpg
    ↓
wx.cloud.callFunction('ocrRecognize')
    { fileID, grade, semester }
                                    cloud.downloadFile(fileID)
                                    图片 → Base64
                                    DashScope qwen3-vl-flash 调用
                                    解析 + 知识点匹配
                                    ← 返回 questions[]
    ↓
展示识别结果，用户勾选题目
    ↓
按知识点分组，Promise.all 并行:
    有 knowledgeId → callFunction('getQuestions')
    无 knowledgeId → callFunction('generateQuestions')
    ↓
合并结果 → globalData.currentQuestions（无 generateParams）
    ↓
wx.navigateTo('practice') source=generated
    ↓
(复用现有 practice_records / wrong_questions 记录)
```

---

## 6. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 图片上传失败 | Toast "上传失败，请重试"，回到 `idle` |
| OCR 识别超时/失败 | Toast "识别失败，请重新拍照"，回到 `idle` |
| AI 返回格式异常 | 云函数内重试 1 次，仍失败返回友好错误 |
| 识别出 0 道题 | 提示"未识别到题目，建议拍清晰一些或调整角度"，回到 `idle` |
| 知识点全部未匹配 | 不阻断，走 `generateQuestions` 纯 AI 路径 |
| 训练题部分生成失败 | 跳过失败项，提示"X 道题生成失败"，剩余正常练习 |
| 训练题全部生成失败 | 提示"生成失败，请重试"，停留结果页 |
| 频率限制触发 | 提示"操作太频繁，请稍后再试" |

---

## 7. 云存储管理

- 上传路径：`ocr/{openid}/{timestamp}.jpg`
- OCR 完成后不立即删除（用于可能的重新分析）
- 扩展 `cleanExpiredLogs` 云函数，定期清理 7 天以上的 OCR 图片

---

## 8. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `cloudfunctions/ocrRecognize/index.js` | **新增** | OCR 云函数主入口 |
| `cloudfunctions/ocrRecognize/config.json` | **新增** | 超时 60s |
| `cloudfunctions/ocrRecognize/package.json` | **新增** | 依赖 openai |
| `cloudfunctions/ocrRecognize/knowledgeMapping.js` | **新增** | 知识点模糊匹配 |
| `cloudfunctions/ocrRecognize/knowledgeData.js` | **新增** | 从 `utils/knowledgeData.js` 拷贝 |
| `pages/improve/improve.js` | **重写** | mock → 真实 OCR 流程 |
| `pages/improve/improve.wxml` | **重写** | 图片标注区 + 列表选择区 |
| `pages/improve/improve.wxss` | **扩展** | 标注样式、结果列表样式 |
