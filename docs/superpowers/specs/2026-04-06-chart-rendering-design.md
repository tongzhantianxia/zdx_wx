# 小学数学图表渲染系统设计文档

## 1. 概述

为微信小程序"出题鸭"新增图表渲染能力，支持统计图、钟表、几何图形等可视化题目。采用统一的 `chartData` 数据结构 + `<chart-renderer>` 分发组件架构，覆盖 2022 版新课标人教版 1-6 年级全部需要图表的知识点。

## 2. 设计决策

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 数据结构 | 统一 `chartData` 字段，替代现有 `diagram` + `numberLine` | 单一入口，结构清晰，便于扩展 |
| 组件架构 | `<chart-renderer>` 分发组件 + 独立子组件 | practice.wxml 简洁，子组件职责单一，可独立开发测试 |
| 渲染方案 | 全部 Canvas 2D 自绘 + 伪 3D（等轴测投影） | 无外部依赖，包体积小，与现有风格一致 |
| 现有组件 | 全部重构到 chartData 体系 | 项目未上线，一步到位避免两套体系并存 |
| 云函数 | 扩展现有 generateQuestions | 避免维护两个云函数 |

## 3. 统一数据结构

### 3.1 题目数据格式

```javascript
{
  // 基础字段（不变）
  id: number,
  type: string,
  contentBlocks: [{ type: 'text' | 'latex', value: string }],
  answer: string,
  answerFormat: 'number' | 'fraction' | 'text',
  answerUnit: string,
  solutionBlocks: [{ type: 'text' | 'latex', value: string }],
  tip: string,

  // 统一可视化字段（替代 diagram + numberLine）
  chartData: {
    chartType: string,  // 见 3.2 枚举
    data: object        // 各类型结构见 3.3
  } | null
}
```

### 3.2 chartType 枚举

```
bar | line | pie | clock | table
| shape_2d | shape_3d
| numberLine | fractionBar | countingBlocks
| grid | direction | transform
| probability | measure
```

共 14 种类型。

### 3.3 各类型 data 结构

#### bar（柱状图）

```typescript
{
  title: string,
  xAxis: string[],
  yAxisLabel: string,
  series: { name: string, data: number[] }[],
  averageLine?: number  // 可选，平均线数值
}
```

#### line（折线图）

```typescript
{
  title: string,
  xAxis: string[],
  yAxisLabel: string,
  series: { name: string, data: number[] }[]
}
```

#### pie（饼图）

```typescript
{
  title: string,
  items: { label: string, value: number, color?: string }[]
}
```

#### clock（钟表）

```typescript
{
  hour: number,    // 1-12
  minute: number   // 0-59
}
```

#### table（统计表）

```typescript
{
  title: string,
  headers: string[],
  rows: (string | number)[][]
}
```

#### shape_2d（平面几何）

支持两种模式：

**高层模式**（大模型输出）：
```typescript
{
  shape: "rectangle" | "square" | "circle" | "triangle" | "parallelogram" | "trapezoid" | "sector",
  dimensions: {
    length?: number, width?: number, side?: number,
    radius?: number, base?: number, height?: number,
    top?: number, angle?: number
  },
  labels?: { text: string, position: [number, number] }[]
}
```

**底层模式**（兼容现有 geometry-canvas）：
```typescript
{
  width: number,
  height: number,
  shapes: [
    { type: "polygon", points: number[][], stroke?: string, fill?: string },
    { type: "circle", center: [number, number], radius: number },
    { type: "line", from: [number, number], to: [number, number] },
    { type: "arc", center: [number, number], radius: number, startAngle: number, endAngle: number },
    { type: "dashed", from: [number, number], to: [number, number] }
  ],
  labels?: { text: string, position: [number, number], fontSize?: number }[],
  annotations?: [
    { type: "rightAngle", vertex: [number, number], dir1: [number, number], dir2: [number, number], size?: number },
    { type: "shade", points: number[][], fill?: string },
    { type: "dimensionLine", from: [number, number], to: [number, number], text: string, offset?: number },
    { type: "arrow", from: [number, number], to: [number, number] },
    { type: "parallel", from: [number, number], to: [number, number] },
    { type: "equal", from: [number, number], to: [number, number] }
  ]
}
```

#### shape_3d（立体几何）

```typescript
{
  shape: "cube" | "cuboid" | "cylinder" | "cone" | "sphere",
  dimensions: { length?: number, width?: number, height?: number, radius?: number },
  viewType: "3d" | "net" | "orthographic",
  // 底层模式（可选，兼容现有实现）
  origin?: [number, number],
  hiddenEdges?: boolean,
  faceFills?: { face: string, fill: string }[]
}
```

#### numberLine（数轴）

```typescript
{
  start: number,
  end: number,
  step: number,
  highlightPoints?: number[],
  labels?: { position: number, text: string, above?: boolean }[]
}
```

#### fractionBar（分数条）

```typescript
{
  numerator: number,
  denominator: number
}
```

#### countingBlocks（计数块）

```typescript
{
  count: number,
  rows: number,
  cols: number
}
```

#### grid（坐标网格，含比例尺）— 第二期

```typescript
{
  gridSize: [number, number],
  points: { coordinate: [number, number], label?: string }[],
  showAxes?: boolean,
  scale?: { ratio: string, unit: string }  // 比例尺，如 "1:1000", "米"
}
```

#### direction（方位图）— 第二期

```typescript
{
  center: string,
  points: {
    direction: string,   // "北" / "东偏南30°"
    distance: number,
    landmark: string
  }[]
}
```

#### transform（图形运动）— 第二期

```typescript
{
  type: "translate" | "rotate" | "reflect" | "scale",
  gridSize: [number, number],
  original: { points: [number, number][], stroke?: string },
  transformed: { points: [number, number][], stroke?: string },
  axis?: { type: "x" | "y" | "custom", points?: [number, number][] }  // 对称轴
}
```

#### probability（概率图）— 第三期

```typescript
{
  type: "spinner" | "pie",
  items: { label: string, probability: number }[]  // 概率之和为 1
}
```

#### measure（测量工具）— 第三期

```typescript
{
  type: "ruler" | "scale",
  value: number,
  unit: "cm" | "m" | "mm",
  showMarkings?: boolean
}
```

## 4. 组件架构

### 4.1 chart-renderer 分发组件

```
components/chart-renderer/
  chart-renderer.js    — 接收 chartData，解析 chartType 和 data
  chart-renderer.wxml  — wx:if 分发到各子组件
  chart-renderer.wxss  — 容器样式 + 错误兜底样式
  chart-renderer.json  — 声明所有子组件依赖
```

Properties：
```javascript
{
  chartData: { type: Object, value: null }
}
```

分发逻辑：
```xml
<bar-chart wx:if="{{chartType === 'bar'}}" data="{{data}}" />
<line-chart wx:if="{{chartType === 'line'}}" data="{{data}}" />
<pie-chart wx:if="{{chartType === 'pie'}}" data="{{data}}" />
<clock-view wx:if="{{chartType === 'clock'}}" data="{{data}}" />
<data-table wx:if="{{chartType === 'table'}}" data="{{data}}" />
<shape-2d wx:if="{{chartType === 'shape_2d'}}" data="{{data}}" />
<shape-3d wx:if="{{chartType === 'shape_3d'}}" data="{{data}}" />
<number-line wx:if="{{chartType === 'numberLine'}}" data="{{data}}" />
<fraction-bar wx:if="{{chartType === 'fractionBar'}}" data="{{data}}" />
<counting-blocks wx:if="{{chartType === 'countingBlocks'}}" data="{{data}}" />
<!-- 二期 -->
<grid-view wx:if="{{chartType === 'grid'}}" data="{{data}}" />
<direction-view wx:if="{{chartType === 'direction'}}" data="{{data}}" />
<transform-view wx:if="{{chartType === 'transform'}}" data="{{data}}" />
<!-- 三期 -->
<probability-view wx:if="{{chartType === 'probability'}}" data="{{data}}" />
<measure-view wx:if="{{chartType === 'measure'}}" data="{{data}}" />
<!-- 兜底 -->
<view wx:if="{{unsupported}}" class="chart-unsupported">
  <text>图表暂不支持</text>
</view>
```

### 4.2 子组件清单

| 组件 | 目录 | 状态 | 渲染方式 | 期次 |
|------|------|------|----------|------|
| `bar-chart` | components/bar-chart/ | 新建 | Canvas 2D | 一期 |
| `line-chart` | components/line-chart/ | 新建 | Canvas 2D | 一期 |
| `pie-chart` | components/pie-chart/ | 新建 | Canvas 2D | 一期 |
| `clock-view` | components/clock-view/ | 新建 | Canvas 2D | 一期 |
| `data-table` | components/data-table/ | 新建 | WXML/CSS | 一期 |
| `shape-2d` | components/shape-2d/ | 重构 | Canvas 2D | 一期 |
| `shape-3d` | components/shape-3d/ | 重构 | Canvas 2D | 一期 |
| `number-line` | components/number-line/ | 重构 | Canvas 2D | 一期 |
| `fraction-bar` | components/fraction-bar/ | 重构 | Canvas 2D | 一期 |
| `counting-blocks` | components/counting-blocks/ | 重构 | Canvas 2D | 一期 |
| `grid-view` | components/grid-view/ | 新建 | Canvas 2D | 二期 |
| `direction-view` | components/direction-view/ | 新建 | Canvas 2D | 二期 |
| `transform-view` | components/transform-view/ | 新建 | Canvas 2D | 二期 |
| `probability-view` | components/probability-view/ | 新建 | Canvas 2D | 三期 |
| `measure-view` | components/measure-view/ | 新建 | Canvas 2D | 三期 |

每个 Canvas 子组件统一接口：`properties: { data: Object }`。

### 4.3 共享工具模块

新建 `utils/canvasHelper.js`：

```javascript
// Canvas 初始化（获取节点、设置 DPR 缩放）
function initCanvas(component, canvasId, callback)

// 预设色板（统计图共用）
const CHART_COLORS = ['#5B9BD5', '#ED7D31', '#70AD47', '#FFC000', '#4472C4', '#A5A5A5']

// 文本测量
function measureText(ctx, text, fontSize)

// 自动计算 Y 轴刻度（最大值向上取整到合适刻度）
function calcYAxisScale(maxValue)
```

## 5. 各图表组件绘制方案

### 5.1 bar-chart

- 绘制网格线 + Y 轴刻度（calcYAxisScale 自动计算）
- X 轴标签居中对齐柱子
- 多系列并列柱子，CHART_COLORS 着色
- 标题居顶，Y 轴单位标签在左侧
- 可选 averageLine：红色虚线 + 标注值

### 5.2 line-chart

- 与 bar-chart 共享坐标系绘制逻辑（网格线、刻度、标签）
- 数据点圆点标记 + 折线连接
- 多系列不同颜色
- 数据点旁显示数值

### 5.3 pie-chart

- 根据 items.value 计算百分比和弧度
- 扇区使用 CHART_COLORS（支持 item 自定义 color 覆盖）
- 扇区外侧引线 + 标签（"篮球 33%"）
- 标题居顶

### 5.4 clock-view

- 圆形表盘 + 12 个刻度数字
- 60 个分钟刻度线（5 的倍数加粗）
- 时针（短粗）、分针（长细）
- 角度计算：分针 `minute * 6°`，时针 `(hour % 12) * 30° + minute * 0.5°`

### 5.5 data-table

- WXML/CSS 实现，非 Canvas
- 表格：表头行 + 数据行，边框线，居中对齐
- 标题居顶
- 适配宽度：列数少时居中，列数多时横向滚动

### 5.6 shape-2d

- 从 geometry-canvas 拆出 2D 绘制逻辑
- 新增高层模式：传入 `shape` + `dimensions`，组件内部自动计算坐标点生成 shapes 数组
- 保留底层模式：直接传 shapes/labels/annotations 数组
- labels 和 annotations 沿用现有实现

### 5.7 shape-3d

- 从 geometry-canvas 拆出 3D 绘制逻辑
- 沿用等轴测投影（`iso()` 函数）
- 支持 cuboid/cube/cylinder/cone/sphere
- viewType 扩展：
  - `"3d"`：等轴测投影（现有）
  - `"net"`：展开图，用 2D 绘制各面并标注
  - `"orthographic"`：三视图，并排绘制正面/上面/侧面

### 5.8 重构的三个组件

number-line / fraction-bar / counting-blocks：绘制逻辑不变，properties 接口从多个独立属性合并为单一 `data` 对象。

## 6. 云函数改造

### 6.1 知识点→图表类型映射

替换现有 `findDiagrams()` 为 `findChartType()`：

```javascript
const KNOWLEDGE_CHART_MAP = {
  // 统计与概率
  '条形统计图': 'bar', '复式条形统计图': 'bar',
  '数据分类': 'bar', '简单分类': 'bar',
  '数据收集整理': 'bar', '简单的统计': 'bar',
  '平均数': 'bar',
  '折线统计图': 'line', '复式折线统计图': 'line',
  '扇形统计图': 'pie',
  '复式统计表': 'table',

  // 钟表
  '认识钟表': 'clock', '认识整时': 'clock',
  '认识时间': 'clock', '认识几时几分': 'clock',
  '秒的认识': 'clock', '24时计时法': 'clock',

  // 平面几何
  '认识平面图形': 'shape_2d', '图形的拼组': 'shape_2d',
  '认识线段': 'shape_2d', '认识角': 'shape_2d', '直角的认识': 'shape_2d',
  '四边形的认识': 'shape_2d', '长方形和正方形的认识': 'shape_2d',
  '周长的认识': 'shape_2d', '长方形和正方形的周长': 'shape_2d',
  '面积和面积单位': 'shape_2d', '长方形和正方形的面积': 'shape_2d',
  '线段、直线、射线': 'shape_2d', '角的度量': 'shape_2d',
  '角的分类': 'shape_2d', '画角': 'shape_2d',
  '平行与垂直': 'shape_2d', '平行四边形和梯形的认识': 'shape_2d',
  '三角形的特性': 'shape_2d', '三角形的分类': 'shape_2d', '三角形内角和': 'shape_2d',
  '平行四边形的面积': 'shape_2d', '三角形的面积': 'shape_2d',
  '梯形的面积': 'shape_2d', '组合图形的面积': 'shape_2d',
  '圆的认识': 'shape_2d', '圆的周长': 'shape_2d', '圆的面积': 'shape_2d', '扇形': 'shape_2d',

  // 立体几何
  '认识立体图形': 'shape_3d', '观察物体': 'shape_3d',
  '从不同方向观察物体': 'shape_3d', '根据视图还原立体图形': 'shape_3d',
  '长方体和正方体的认识': 'shape_3d', '长方体和正方体的表面积': 'shape_3d',
  '长方体和正方体的体积': 'shape_3d',
  '圆柱的认识': 'shape_3d', '圆柱的表面积': 'shape_3d', '圆柱的体积': 'shape_3d',
  '圆锥的认识': 'shape_3d', '圆锥的体积': 'shape_3d',

  // 数轴
  '认识小数': 'numberLine', '小数的意义': 'numberLine',
  '负数的认识': 'numberLine', '在直线上表示正数、0和负数': 'numberLine',

  // 分数条
  '分数的初步认识': 'fractionBar', '分数的简单计算': 'fractionBar',
  '分数的意义': 'fractionBar',

  // 二期
  '用数对表示位置': 'grid', '比例尺': 'grid',
  '认识东南西北': 'direction', '认识东北、东南、西北、西南': 'direction',
  '用方向和距离确定位置': 'direction',
  '轴对称图形': 'transform', '轴对称': 'transform',
  '平移': 'transform', '旋转': 'transform', '图形的放大与缩小': 'transform',

  // 三期
  '可能性的大小': 'probability', '可能性的计算': 'probability',
  '认识厘米和米': 'measure', '毫米、分米的认识': 'measure',
  '认识克和千克': 'measure'
};
```

### 6.2 Prompt 改造

`buildUserPrompt()` 根据 `findChartType()` 结果动态注入对应 chartType 的数据结构示例。

示例（当知识点匹配 bar 时追加）：

```
【图表要求】本题需要 chartData，chartType 为 "bar"。
输出格式：
"chartData": {
  "chartType": "bar",
  "data": {
    "title": "图表标题",
    "xAxis": ["标签1", "标签2"],
    "yAxisLabel": "单位",
    "series": [{ "name": "系列名", "data": [数值1, 数值2] }]
  }
}
```

每种 chartType 预定义一份 prompt 模板，按需注入。

### 6.3 SYSTEM_PROMPT 改造

- 删除 `diagram设为null` 的规则
- 删除数轴用 `numberLine` 独立字段的规则
- 新增：`chartData` 字段说明，不需要图表时设为 `null`
- 保留现有的年级知识范围限制、禁止内容等规则不变

### 6.4 响应解析

- 统一提取 `chartData` 字段（替代分别提取 diagram 和 numberLine）
- 校验 `chartType` 在合法枚举内
- 对已知 chartType 做字段校验（如 bar 必须有 xAxis 和 series）
- 校验失败时 chartData 降级为 null（仍返回题目文本）

## 7. 前端页面改造

### 7.1 practice.wxml

删除现有 4 段条件渲染，替换为：

```xml
<chart-renderer
  wx:if="{{currentQuestion.chartData}}"
  chartData="{{currentQuestion.chartData}}"
/>
```

### 7.2 practice.json

```json
{
  "usingComponents": {
    "duck-animation": "/components/duck-animation/duck-animation",
    "math-text": "/components/math-text/math-text",
    "math-input": "/components/math-input/math-input",
    "chart-renderer": "/components/chart-renderer/chart-renderer"
  }
}
```

### 7.3 practice.js

- 删除 diagram / numberLine 的分散处理逻辑
- chartData 从云函数返回后直接透传，无需转换

### 7.4 错误兜底

chart-renderer 内部：chartType 无法匹配时显示灰色占位区域 + "图表暂不支持"。

## 8. 文件变更清单

### 新建

```
components/chart-renderer/   (js/wxml/wxss/json)
components/bar-chart/        (js/wxml/wxss/json)
components/line-chart/       (js/wxml/wxss/json)
components/pie-chart/        (js/wxml/wxss/json)
components/clock-view/       (js/wxml/wxss/json)
components/data-table/       (js/wxml/wxss/json)
components/shape-2d/         (js/wxml/wxss/json)
components/shape-3d/         (js/wxml/wxss/json)
utils/canvasHelper.js
```

### 重构

```
components/number-line/number-line.js    — properties 改为单一 data 对象
components/fraction-bar/fraction-bar.js  — 同上
components/counting-blocks/counting-blocks.js — 同上
```

### 删除

```
components/geometry-canvas/  — 拆分为 shape-2d 和 shape-3d
```

### 修改

```
pages/practice/practice.js    — 删除 diagram/numberLine 处理，chartData 透传
pages/practice/practice.wxml  — 4 段条件渲染 → 单行 chart-renderer
pages/practice/practice.json  — 组件注册替换
cloudfunctions/generateQuestions/index.js — findChartType + prompt + 解析
```

## 9. 实现分期

| 期次 | 内容 | 图表类型 |
|------|------|----------|
| 第一期 | 核心框架 + 统计图 + 钟表 + 重构 | bar, line, pie, clock, table, shape_2d, shape_3d, numberLine, fractionBar, countingBlocks |
| 第二期 | 位置与运动 | grid(含 scale), direction, transform |
| 第三期 | 概率与测量 | probability, measure |

## 10. 知识点覆盖验证

全部 404 个知识点中，需要图表的知识点按年级覆盖情况：

- 1 年级：认识立体图形(shape_3d)、认识整时(clock)、认识平面图形(shape_2d)、简单分类(bar)
- 2 年级：认识厘米和米(measure)、认识线段/角(shape_2d)、观察物体(shape_3d)、认识时间(clock)、简单统计(bar)、轴对称/平移(transform)
- 3 年级：秒的认识/24时计时法(clock)、测量(measure)、四边形/周长/面积(shape_2d)、分数初步(fractionBar)、复式统计表(table)、东南西北(direction)、认识小数(numberLine)
- 4 年级：线段直线射线/角/平行垂直/平行四边形梯形(shape_2d)、三角形(shape_2d)、条形统计图/平均数(bar)、从不同方向观察物体(shape_3d)、轴对称/平移(transform)、小数意义(numberLine)
- 5 年级：用数对表示位置(grid)、可能性(probability)、多边形面积(shape_2d)、长方体正方体(shape_3d)、旋转(transform)、折线统计图(line)、分数意义(fractionBar)、根据视图还原立体图形(shape_3d)
- 6 年级：方向与距离确定位置(direction)、圆/扇形(shape_2d)、扇形统计图(pie)、负数/数轴(numberLine)、圆柱圆锥(shape_3d)、比例尺(grid)、图形放大缩小(transform)

全部需要图表的知识点均已覆盖，无遗漏。
