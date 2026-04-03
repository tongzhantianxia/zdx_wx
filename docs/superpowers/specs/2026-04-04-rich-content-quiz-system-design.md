# 出题系统富内容渲染优化设计

> 日期：2026-04-04
> 状态：设计确认，待实施

## 概述

将「出题鸭」的出题系统从纯文本渲染升级为支持数学公式（LaTeX）和几何图形（Canvas 2D）的富内容渲染系统。覆盖小学全年级及未来小学奥数扩展。

## 需求摘要

| 维度 | 要求 |
|------|------|
| 年级范围 | 小学1-6年级，未来扩展小学奥数 |
| 公式渲染 | 分数、幂次、根号、混合运算等 LaTeX 公式 |
| 几何复杂度 | 高：基本形状、辅助线、阴影区域、组合图形、立体展开图、对称/旋转变换、坐标系图形 |
| 题目来源 | AI 生成 + 题库预置，均使用统一富内容格式 |
| 答案输入 | 增强型输入面板（数字、分数、文本） |
| 旧数据 | 不兼容，全部清除重建 |

## 技术方案

**方案 A（已选定）：原生 Canvas 几何绘图 + KaTeX 公式渲染**

- 公式：`@rojer/katex-mini` 将 LaTeX 解析为 `rich-text` nodes，原生渲染
- 几何：小程序 Canvas 2D API，根据结构化 JSON 描述绘制
- 全原生，性能好，可与答题输入框、鸭子动画混排

---

## 一、统一题目数据模型

所有题目（AI 生成和题库预置）使用统一的结构化格式，不再保留纯文本 fallback。

### 1.1 完整题目结构

```json
{
  "id": 1,
  "type": "geometry",
  "contentBlocks": [
    { "type": "text", "value": "如图所示，三角形ABC中，" },
    { "type": "latex", "value": "AB = 5\\text{cm}" },
    { "type": "text", "value": "，" },
    { "type": "latex", "value": "BC = 4\\text{cm}" },
    { "type": "text", "value": "，" },
    { "type": "latex", "value": "\\angle B = 90°" },
    { "type": "text", "value": "，求三角形ABC的面积。" }
  ],
  "diagram": {
    "type": "geometry",
    "width": 200,
    "height": 200,
    "shapes": [
      {
        "type": "polygon",
        "points": [[20, 170], [20, 30], [160, 170]],
        "stroke": "#333",
        "fill": "transparent"
      }
    ],
    "labels": [
      { "text": "A", "position": [10, 20], "fontSize": 14 },
      { "text": "B", "position": [10, 180], "fontSize": 14 },
      { "text": "C", "position": [165, 180], "fontSize": 14 },
      { "text": "5cm", "position": [5, 100], "fontSize": 12 },
      { "text": "4cm", "position": [80, 185], "fontSize": 12 }
    ],
    "annotations": [
      { "type": "rightAngle", "vertex": [20, 170], "dir1": [0, -1], "dir2": [1, 0], "size": 15 }
    ]
  },
  "answer": "10",
  "answerUnit": "平方厘米",
  "answerFormat": "number",
  "solutionBlocks": [
    { "type": "text", "value": "直角三角形面积 = " },
    { "type": "latex", "value": "\\frac{1}{2} \\times 5 \\times 4 = 10" },
    { "type": "text", "value": " 平方厘米" }
  ],
  "tip": "直角三角形的两条直角边就是底和高"
}
```

### 1.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 题目序号 |
| `type` | string | 是 | 题型：`calculation` / `fillBlank` / `application` / `geometry` |
| `contentBlocks` | Array\<Block\> | 是 | 题干富内容 blocks |
| `diagram` | Object \| null | 否 | 几何图描述，非几何题为 null |
| `answer` | string | 是 | 正确答案 |
| `answerUnit` | string | 否 | 答案单位，展示在输入框旁 |
| `answerFormat` | string | 是 | 答案输入类型：`number` / `fraction` / `text` |
| `solutionBlocks` | Array\<Block\> | 是 | 解析富内容 blocks |
| `tip` | string | 否 | 提示文字（纯文本） |

### 1.3 Block 类型

| type | value 说明 |
|------|-----------|
| `text` | 纯文本字符串 |
| `latex` | LaTeX 公式字符串 |

### 1.4 Diagram 结构

```
diagram: {
  type: "geometry",
  width: number,      // 逻辑画布宽度
  height: number,     // 逻辑画布高度
  shapes: Shape[],
  labels: Label[],
  annotations: Annotation[]
}
```

**Shape 类型**：

| type | 字段 | 说明 |
|------|------|------|
| `polygon` | `points: [x,y][]`, `stroke`, `fill` | 多边形（至少3个点） |
| `circle` | `center: [x,y]`, `radius`, `stroke`, `fill` | 圆 |
| `line` | `from: [x,y]`, `to: [x,y]`, `stroke` | 线段 |
| `arc` | `center: [x,y]`, `radius`, `startAngle`, `endAngle`, `stroke` | 弧 |
| `dashed` | `from: [x,y]`, `to: [x,y]`, `stroke` | 虚线 |

**Label 结构**：

```
{ text: string, position: [x, y], fontSize: number }
```

**Annotation 类型**：

| type | 字段 | 说明 |
|------|------|------|
| `rightAngle` | `vertex: [x,y]`, `dir1: [dx,dy]`, `dir2: [dx,dy]`, `size` | 直角符号，dir1/dir2 为从顶点出发的两条边的单位方向向量 |
| `shade` | `points: [x,y][]`, `fill` | 阴影区域 |
| `arrow` | `from: [x,y]`, `to: [x,y]` | 箭头 |
| `parallel` | `from: [x,y]`, `to: [x,y]` | 平行标记 |
| `equal` | `from: [x,y]`, `to: [x,y]`, `count` | 等长标记（count 为短横线数量） |

---

## 二、前端渲染架构

### 2.1 新增组件

#### `math-text` —— 混合文本与公式渲染

**路径**：`components/math-text/`

**职责**：接收 `contentBlocks` 数组，按顺序渲染 text 和 latex block，实现文字与公式的内联混排。

**实现要点**：
- `text` block → 原生 `<text>` 组件
- `latex` block → `@rojer/katex-mini` 的 `parse()` 转为 `rich-text` nodes
- `display: inline` 布局实现公式与文字同行混排

**Properties**：
- `blocks`: Array\<Block\> — 富文本 blocks

#### `geometry-canvas` —— 几何图形绘制

**路径**：`components/geometry-canvas/`

**职责**：接收 `diagram` JSON，用 Canvas 2D API 绘制几何图形。

**实现要点**：
- 使用 `<canvas type="2d">`
- 按 shapes → annotations → labels 分层绘制
- 自动适配屏幕宽度，根据 `diagram.width/height` 和容器宽度计算缩放比
- 使用 `dpr` 倍率绘制适配高清屏

**绘图引擎**：

| Shape 类型 | Canvas 操作 |
|-----------|------------|
| `polygon` | `moveTo` + `lineTo` 闭合路径 |
| `circle` | `arc(cx, cy, r, 0, 2π)` |
| `line` | `moveTo` + `lineTo` |
| `arc` | `arc(cx, cy, r, startAngle, endAngle)` |
| `dashed` | `setLineDash` + `lineTo` |

| Annotation 类型 | 绘制方式 |
|----------------|---------|
| `rightAngle` | 从顶点画小正方形 |
| `shade` | 填充半透明色的闭合路径 |
| `arrow` | 线段末端加三角形箭头 |
| `parallel` | 线段中点加平行标记符号 |
| `equal` | 线段中点加等长标记短横线 |

**Properties**：
- `diagram`: Object — 几何图描述 JSON

#### `math-input` —— 增强型答案输入

**路径**：`components/math-input/`

**职责**：根据 `answerFormat` 展示不同的输入面板。

**三种模式**：
- `number`：数字输入框 + 单位显示（`answerUnit`）
- `fraction`：分数输入面板 — 分子输入框 / 分母输入框，中间横线
- `text`：普通文本输入框

**统一输出**：抛出 `answer` 事件，值为标准化字符串。分数模式输出 `"3/4"` 格式。

**Properties**：
- `format`: string — `number` / `fraction` / `text`
- `unit`: string — 答案单位

**Events**：
- `answer`: `{ value: string }` — 用户输入的标准化答案

### 2.2 practice 页面改造

题目区域布局替换为新组件组合：

```xml
<!-- 题干 -->
<math-text blocks="{{currentQuestion.contentBlocks}}" />

<!-- 几何图 -->
<geometry-canvas wx:if="{{currentQuestion.diagram}}" diagram="{{currentQuestion.diagram}}" />

<!-- 答题输入 -->
<math-input
  format="{{currentQuestion.answerFormat}}"
  unit="{{currentQuestion.answerUnit}}"
  bind:answer="onAnswerInput"
/>

<!-- 解析 -->
<view wx:if="{{showExplanation}}">
  <math-text blocks="{{currentQuestion.solutionBlocks}}" />
</view>
```

鸭子动画、提示、进度条等现有功能不受影响。

---

## 三、AI 出题与云函数改造

### 3.1 `generateQuestions` 云函数

**改造内容**：重写 prompt 模板，按题型分类指导 AI 输出结构化 JSON。

**Prompt 策略**：
- **计算题/填空题**：`contentBlocks` 中用 `latex` block 表达公式，不需要 `diagram`
- **几何题**：`contentBlocks` + `diagram` JSON（shapes/labels/annotations），prompt 提供 JSON Schema 和标准模板坐标
- **应用题**：根据内容决定是否需要 `diagram`

**Prompt 关键约束**：
1. 坐标限定在 `[0, width] x [0, height]` 范围内
2. Labels 相邻间隔至少 20px
3. Shapes 的 points 必须构成合法几何图形
4. 常见图形提供标准模板坐标，AI 调整数值和标注即可

**输出校验层**（AI 返回后）：
- 检查 `contentBlocks` 每个 block 的 `type` 是否在 `['text', 'latex']` 内
- 检查 `diagram.shapes` 坐标是否在 `[0, width] x [0, height]` 范围内
- 检查 LaTeX 字符串括号配对
- 校验失败的题目丢弃，重新请求

### 3.2 `getQuestions` 云函数

**改造内容**：`formatBankQuestion` 直接透传新格式字段（`contentBlocks`、`diagram`、`solutionBlocks`、`answerFormat`、`answerUnit`）。

### 3.3 前端格式化

`practice.js` 的 `formatSingleQuestion` 改为：

```javascript
formatSingleQuestion: function(q) {
  return {
    id: q.id || Date.now() + Math.random(),
    contentBlocks: q.contentBlocks,
    diagram: q.diagram || null,
    answer: q.answer,
    answerFormat: q.answerFormat || 'number',
    answerUnit: q.answerUnit || '',
    type: q.type || '计算题',
    typeName: q.type || '计算题',
    difficulty: this.getDifficultyLevel(q.difficulty),
    difficultyText: q.difficulty || '中等',
    hint: q.tip || '',
    solutionBlocks: q.solutionBlocks,
    _bankId: q._bankId || null
  };
}
```

移除 `processQuestions`（旧 DB 格式处理函数）。

---

## 四、答案校验增强

### 4.1 `checkAnswer` 改造

```javascript
checkAnswer: function(userAnswer, correctAnswer, answerFormat) {
  if (answerFormat === 'fraction') {
    const userVal = this.parseFraction(userAnswer);
    const correctVal = this.parseFraction(correctAnswer);
    if (userVal !== null && correctVal !== null) {
      return Math.abs(userVal - correctVal) < 0.0001;
    }
  }

  const userNum = parseFloat(userAnswer);
  const correctNum = parseFloat(correctAnswer);
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    return Math.abs(userNum - correctNum) < 0.0001;
  }

  return userAnswer.toLowerCase().replace(/\s/g, '') ===
         correctAnswer.toLowerCase().replace(/\s/g, '');
}

parseFraction: function(str) {
  if (str.includes('/')) {
    const parts = str.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }
  return parseFloat(str) || null;
}
```

---

## 五、分包与依赖策略

### 5.1 KaTeX 分包加载

`@rojer/katex-mini` 约 200-300KB，通过分包隔离：

- `practice` 页面放入 `packagePractice` 分包
- KaTeX 依赖仅在分包内引用
- 主包页面（`practice-select`、`improve`、`mine`）不受影响

### 5.2 分包预下载

`app.json` 配置：

```json
{
  "subPackages": [
    {
      "root": "packagePractice",
      "pages": ["pages/practice/practice"]
    }
  ],
  "preloadRule": {
    "pages/practice-select/practice-select": {
      "network": "all",
      "packages": ["packagePractice"]
    }
  }
}
```

用户在选题页面时预下载练习分包，进入练习页面零等待。

### 5.3 数据库清理重建

- 清空 `question_bank`、`wrong_questions`、`user_question_log`、`practice_records` 集合
- 所有题目统一使用新数据模型

---

## 六、改动范围汇总

| 模块 | 改动内容 |
|------|---------|
| **新增组件** | `components/math-text/`、`components/geometry-canvas/`、`components/math-input/` |
| **云函数** | `generateQuestions`（prompt 重写 + 校验层）、`getQuestions`（格式化适配） |
| **页面** | `practice`（引入新组件、改造 formatSingleQuestion / checkAnswer） |
| **数据库** | 清空重建，统一新格式 |
| **配置** | `app.json`（分包 + 预下载） |
| **依赖** | `@rojer/katex-mini`（npm 安装） |
| **移除** | `processQuestions` 旧格式处理函数、旧数据兼容逻辑 |
