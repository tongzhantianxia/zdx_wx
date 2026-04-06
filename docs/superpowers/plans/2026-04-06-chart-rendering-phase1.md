# Chart Rendering System Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build unified chartData architecture with chart-renderer dispatcher and 10 chart components (5 new + 5 refactored), plus cloud function changes to generate chart data.

**Architecture:** Single `<chart-renderer>` component receives `chartData` object, dispatches to child components by `chartType`. All Canvas components share `utils/canvasHelper.js` for initialization and common utilities. Cloud function `generateQuestions` maps knowledge points to chart types and injects chart-specific prompt templates.

**Tech Stack:** WeChat Mini Program, Canvas 2D API, Cloud Functions (Node.js), Qwen LLM API

---

### Task 1: Create `utils/canvasHelper.js` shared module

**Files:**
- Create: `utils/canvasHelper.js`

- [ ] **Step 1: Create the canvasHelper module**

```javascript
// utils/canvasHelper.js

/**
 * Initialize a Canvas 2D context with DPR scaling.
 * @param {Component} component - the wx Component instance
 * @param {string} canvasId - CSS selector id (without #)
 * @param {number} logicalWidth - desired logical width in px
 * @param {number} logicalHeight - desired logical height in px
 * @param {function} callback - (ctx, canvas, width, height) => void
 */
function initCanvas(component, canvasId, logicalWidth, logicalHeight, callback) {
  const query = component.createSelectorQuery();
  query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) {
      setTimeout(() => initCanvas(component, canvasId, logicalWidth, logicalHeight, callback), 50);
      return;
    }
    const canvas = res[0].node;
    const ctx = canvas.getContext('2d');
    const dpr = wx.getWindowInfo().pixelRatio || 2;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    callback(ctx, canvas, logicalWidth, logicalHeight);
  });
}

/**
 * Get container width minus horizontal padding (20px each side).
 */
function getContainerWidth() {
  const sysInfo = wx.getWindowInfo();
  return sysInfo.windowWidth - 40;
}

// Chart color palette shared by bar/line/pie
const CHART_COLORS = ['#5B9BD5', '#ED7D31', '#70AD47', '#FFC000', '#4472C4', '#A5A5A5', '#264478', '#9B59B6'];

/**
 * Calculate nice Y-axis scale: returns { max, step, tickCount }.
 * @param {number} dataMax - the maximum data value
 */
function calcYAxisScale(dataMax) {
  if (dataMax <= 0) return { max: 10, step: 2, tickCount: 5 };
  const raw = dataMax * 1.2;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  let niceStep;
  if (residual <= 1.5) niceStep = magnitude * 0.2;
  else if (residual <= 3) niceStep = magnitude * 0.5;
  else if (residual <= 7) niceStep = magnitude;
  else niceStep = magnitude * 2;
  // Ensure step is at least 1 for integer data
  if (niceStep < 1) niceStep = 1;
  const niceMax = Math.ceil(raw / niceStep) * niceStep;
  const tickCount = Math.round(niceMax / niceStep);
  return { max: niceMax, step: niceStep, tickCount };
}

module.exports = {
  initCanvas,
  getContainerWidth,
  CHART_COLORS,
  calcYAxisScale
};
```

- [ ] **Step 2: Commit**

```bash
git add utils/canvasHelper.js
git commit -m "feat: add canvasHelper shared utility module"
```

---

### Task 2: Create `<chart-renderer>` dispatcher component

**Files:**
- Create: `components/chart-renderer/chart-renderer.js`
- Create: `components/chart-renderer/chart-renderer.wxml`
- Create: `components/chart-renderer/chart-renderer.wxss`
- Create: `components/chart-renderer/chart-renderer.json`

- [ ] **Step 1: Create chart-renderer.json**

```json
{
  "component": true,
  "usingComponents": {
    "bar-chart": "/components/bar-chart/bar-chart",
    "line-chart": "/components/line-chart/line-chart",
    "pie-chart": "/components/pie-chart/pie-chart",
    "clock-view": "/components/clock-view/clock-view",
    "data-table": "/components/data-table/data-table",
    "shape-2d": "/components/shape-2d/shape-2d",
    "shape-3d": "/components/shape-3d/shape-3d",
    "number-line": "/components/number-line/number-line",
    "fraction-bar": "/components/fraction-bar/fraction-bar",
    "counting-blocks": "/components/counting-blocks/counting-blocks"
  }
}
```

- [ ] **Step 2: Create chart-renderer.js**

```javascript
const SUPPORTED_TYPES = [
  'bar', 'line', 'pie', 'clock', 'table',
  'shape_2d', 'shape_3d',
  'numberLine', 'fractionBar', 'countingBlocks'
];

Component({
  properties: {
    chartData: {
      type: Object,
      value: null,
      observer: '_onChartDataChange'
    }
  },

  data: {
    chartType: '',
    data: null,
    unsupported: false
  },

  methods: {
    _onChartDataChange(val) {
      if (!val || !val.chartType) {
        this.setData({ chartType: '', data: null, unsupported: false });
        return;
      }
      const supported = SUPPORTED_TYPES.includes(val.chartType);
      this.setData({
        chartType: supported ? val.chartType : '',
        data: val.data || null,
        unsupported: !supported
      });
    }
  }
});
```

- [ ] **Step 3: Create chart-renderer.wxml**

```xml
<view class="chart-renderer">
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
  <view wx:if="{{unsupported}}" class="chart-unsupported">
    <text class="unsupported-text">图表暂不支持</text>
  </view>
</view>
```

- [ ] **Step 4: Create chart-renderer.wxss**

```css
.chart-renderer {
  width: 100%;
  margin: 16rpx 0;
}

.chart-unsupported {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  margin: 16rpx 0;
}

.unsupported-text {
  font-size: 28rpx;
  color: #999;
}
```

- [ ] **Step 5: Commit**

```bash
git add components/chart-renderer/
git commit -m "feat: add chart-renderer dispatcher component"
```

---

### Task 3: Create `<bar-chart>` component

**Files:**
- Create: `components/bar-chart/bar-chart.js`
- Create: `components/bar-chart/bar-chart.wxml`
- Create: `components/bar-chart/bar-chart.wxss`
- Create: `components/bar-chart/bar-chart.json`

- [ ] **Step 1: Create bar-chart.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: Create bar-chart.wxml**

```xml
<view class="bar-chart-wrap">
  <canvas type="2d" id="barCanvas" class="bar-canvas" style="width:{{canvasWidth}}px;height:{{canvasHeight}}px;"></canvas>
</view>
```

- [ ] **Step 3: Create bar-chart.wxss**

```css
.bar-chart-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.bar-canvas {
  display: block;
}
```

- [ ] **Step 4: Create bar-chart.js**

```javascript
const { initCanvas, getContainerWidth, CHART_COLORS, calcYAxisScale } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 220
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.xAxis || !d.series || !d.series.length) return;

      const width = getContainerWidth();
      const height = Math.round(width * 0.65);
      this.setData({ canvasWidth: width, canvasHeight: height });

      setTimeout(() => {
        initCanvas(this, 'barCanvas', width, height, (ctx) => {
          this._draw(ctx, d, width, height);
        });
      }, 20);
    },

    _draw(ctx, d, W, H) {
      const padding = { top: 35, right: 15, bottom: 35, left: 45 };
      const chartW = W - padding.left - padding.right;
      const chartH = H - padding.top - padding.bottom;

      // Title
      if (d.title) {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.title, W / 2, 6);
      }

      // Y-axis scale
      const allValues = d.series.flatMap(s => s.data);
      const dataMax = Math.max(...allValues, 0);
      const { max: yMax, step: yStep, tickCount } = calcYAxisScale(dataMax);

      // Y-axis labels and grid lines
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#666';

      for (let i = 0; i <= tickCount; i++) {
        const val = i * yStep;
        const y = padding.top + chartH - (val / yMax) * chartH;
        ctx.fillText(String(val), padding.left - 6, y);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Y-axis unit label
      if (d.yAxisLabel) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.fillText(d.yAxisLabel, padding.left - 6, padding.top - 10);
      }

      // Bars
      const seriesCount = d.series.length;
      const groupCount = d.xAxis.length;
      const groupWidth = chartW / groupCount;
      const barGroupWidth = groupWidth * 0.7;
      const barWidth = barGroupWidth / seriesCount;
      const gap = groupWidth * 0.15;

      d.series.forEach((series, si) => {
        ctx.fillStyle = CHART_COLORS[si % CHART_COLORS.length];
        series.data.forEach((val, xi) => {
          const x = padding.left + xi * groupWidth + gap + si * barWidth;
          const barH = (val / yMax) * chartH;
          const y = padding.top + chartH - barH;
          ctx.fillRect(x, y, barWidth - 1, barH);

          // Value label on top of bar
          ctx.fillStyle = '#333';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(val), x + (barWidth - 1) / 2, y - 2);
          ctx.fillStyle = CHART_COLORS[si % CHART_COLORS.length];
        });
      });

      // X-axis labels
      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      d.xAxis.forEach((label, i) => {
        const x = padding.left + i * groupWidth + groupWidth / 2;
        ctx.fillText(label, x, padding.top + chartH + 6);
      });

      // Average line
      if (d.averageLine != null) {
        const avgY = padding.top + chartH - (d.averageLine / yMax) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, avgY);
        ctx.lineTo(W - padding.right, avgY);
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#E74C3C';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('平均:' + d.averageLine, W - padding.right + 2, avgY - 2);
      }

      // Legend (if multiple series)
      if (seriesCount > 1) {
        ctx.font = '10px sans-serif';
        let legendX = padding.left;
        const legendY = H - 6;
        d.series.forEach((s, si) => {
          ctx.fillStyle = CHART_COLORS[si % CHART_COLORS.length];
          ctx.fillRect(legendX, legendY - 8, 12, 8);
          ctx.fillStyle = '#333';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(s.name, legendX + 15, legendY);
          legendX += ctx.measureText(s.name).width + 30;
        });
      }

      ctx.restore();
    }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add components/bar-chart/
git commit -m "feat: add bar-chart Canvas 2D component"
```

---

### Task 4: Create `<line-chart>` component

**Files:**
- Create: `components/line-chart/line-chart.js`
- Create: `components/line-chart/line-chart.wxml`
- Create: `components/line-chart/line-chart.wxss`
- Create: `components/line-chart/line-chart.json`

- [ ] **Step 1: Create line-chart.json, .wxml, .wxss**

line-chart.json:
```json
{
  "component": true,
  "usingComponents": {}
}
```

line-chart.wxml:
```xml
<view class="line-chart-wrap">
  <canvas type="2d" id="lineCanvas" class="line-canvas" style="width:{{canvasWidth}}px;height:{{canvasHeight}}px;"></canvas>
</view>
```

line-chart.wxss:
```css
.line-chart-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.line-canvas {
  display: block;
}
```

- [ ] **Step 2: Create line-chart.js**

```javascript
const { initCanvas, getContainerWidth, CHART_COLORS, calcYAxisScale } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 220
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.xAxis || !d.series || !d.series.length) return;

      const width = getContainerWidth();
      const height = Math.round(width * 0.65);
      this.setData({ canvasWidth: width, canvasHeight: height });

      setTimeout(() => {
        initCanvas(this, 'lineCanvas', width, height, (ctx) => {
          this._draw(ctx, d, width, height);
        });
      }, 20);
    },

    _draw(ctx, d, W, H) {
      const padding = { top: 35, right: 15, bottom: 35, left: 45 };
      const chartW = W - padding.left - padding.right;
      const chartH = H - padding.top - padding.bottom;

      // Title
      if (d.title) {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.title, W / 2, 6);
      }

      // Y-axis
      const allValues = d.series.flatMap(s => s.data);
      const dataMax = Math.max(...allValues, 0);
      const { max: yMax, step: yStep, tickCount } = calcYAxisScale(dataMax);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#666';

      for (let i = 0; i <= tickCount; i++) {
        const val = i * yStep;
        const y = padding.top + chartH - (val / yMax) * chartH;
        ctx.fillText(String(val), padding.left - 6, y);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        ctx.stroke();
      }

      if (d.yAxisLabel) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.fillText(d.yAxisLabel, padding.left - 6, padding.top - 10);
      }

      // X-axis labels
      const pointCount = d.xAxis.length;
      const xGap = chartW / (pointCount - 1 || 1);

      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      d.xAxis.forEach((label, i) => {
        const x = padding.left + i * xGap;
        ctx.fillText(label, x, padding.top + chartH + 6);
      });

      // Lines and points
      d.series.forEach((series, si) => {
        const color = CHART_COLORS[si % CHART_COLORS.length];

        // Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        series.data.forEach((val, xi) => {
          const x = padding.left + xi * xGap;
          const y = padding.top + chartH - (val / yMax) * chartH;
          if (xi === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Points and value labels
        series.data.forEach((val, xi) => {
          const x = padding.left + xi * xGap;
          const y = padding.top + chartH - (val / yMax) * chartH;

          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#333';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(String(val), x, y - 6);
        });
      });

      // Legend
      if (d.series.length > 1) {
        ctx.font = '10px sans-serif';
        let legendX = padding.left;
        const legendY = H - 6;
        d.series.forEach((s, si) => {
          const color = CHART_COLORS[si % CHART_COLORS.length];
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(legendX, legendY - 4);
          ctx.lineTo(legendX + 12, legendY - 4);
          ctx.stroke();
          ctx.fillStyle = '#333';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(s.name, legendX + 15, legendY);
          legendX += ctx.measureText(s.name).width + 30;
        });
      }

      ctx.restore();
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add components/line-chart/
git commit -m "feat: add line-chart Canvas 2D component"
```

---

### Task 5: Create `<pie-chart>` component

**Files:**
- Create: `components/pie-chart/pie-chart.js`
- Create: `components/pie-chart/pie-chart.wxml`
- Create: `components/pie-chart/pie-chart.wxss`
- Create: `components/pie-chart/pie-chart.json`

- [ ] **Step 1: Create pie-chart.json, .wxml, .wxss**

pie-chart.json:
```json
{
  "component": true,
  "usingComponents": {}
}
```

pie-chart.wxml:
```xml
<view class="pie-chart-wrap">
  <canvas type="2d" id="pieCanvas" class="pie-canvas" style="width:{{canvasWidth}}px;height:{{canvasHeight}}px;"></canvas>
</view>
```

pie-chart.wxss:
```css
.pie-chart-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.pie-canvas {
  display: block;
}
```

- [ ] **Step 2: Create pie-chart.js**

```javascript
const { initCanvas, getContainerWidth, CHART_COLORS } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 250
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.items || !d.items.length) return;

      const width = getContainerWidth();
      const height = Math.round(width * 0.75);
      this.setData({ canvasWidth: width, canvasHeight: height });

      setTimeout(() => {
        initCanvas(this, 'pieCanvas', width, height, (ctx) => {
          this._draw(ctx, d, width, height);
        });
      }, 20);
    },

    _draw(ctx, d, W, H) {
      // Title
      let titleOffset = 0;
      if (d.title) {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.title, W / 2, 6);
        titleOffset = 24;
      }

      const total = d.items.reduce((sum, item) => sum + item.value, 0);
      if (total <= 0) return;

      const cx = W / 2;
      const availH = H - titleOffset - 30; // leave room for legend
      const radius = Math.min(W / 2 - 60, availH / 2 - 10);
      const cy = titleOffset + availH / 2;

      let startAngle = -Math.PI / 2;

      d.items.forEach((item, i) => {
        const sliceAngle = (item.value / total) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;
        const color = item.color || CHART_COLORS[i % CHART_COLORS.length];

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label with leader line
        const midAngle = startAngle + sliceAngle / 2;
        const labelRadius = radius + 16;
        const lx = cx + Math.cos(midAngle) * labelRadius;
        const ly = cy + Math.sin(midAngle) * labelRadius;
        const innerX = cx + Math.cos(midAngle) * (radius - 5);
        const innerY = cy + Math.sin(midAngle) * (radius - 5);

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(lx, ly);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([]);
        ctx.stroke();

        const pct = Math.round((item.value / total) * 100);
        const labelText = item.label + ' ' + pct + '%';
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = Math.cos(midAngle) >= 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const textX = lx + (Math.cos(midAngle) >= 0 ? 4 : -4);
        ctx.fillText(labelText, textX, ly);

        startAngle = endAngle;
      });

      ctx.restore();
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add components/pie-chart/
git commit -m "feat: add pie-chart Canvas 2D component"
```

---

### Task 6: Create `<clock-view>` component

**Files:**
- Create: `components/clock-view/clock-view.js`
- Create: `components/clock-view/clock-view.wxml`
- Create: `components/clock-view/clock-view.wxss`
- Create: `components/clock-view/clock-view.json`

- [ ] **Step 1: Create clock-view.json, .wxml, .wxss**

clock-view.json:
```json
{
  "component": true,
  "usingComponents": {}
}
```

clock-view.wxml:
```xml
<view class="clock-wrap">
  <canvas type="2d" id="clockCanvas" class="clock-canvas" style="width:{{canvasSize}}px;height:{{canvasSize}}px;"></canvas>
</view>
```

clock-view.wxss:
```css
.clock-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.clock-canvas {
  display: block;
}
```

- [ ] **Step 2: Create clock-view.js**

```javascript
const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasSize: 200
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || d.hour == null) return;

      const size = Math.min(getContainerWidth(), 220);
      this.setData({ canvasSize: size });

      setTimeout(() => {
        initCanvas(this, 'clockCanvas', size, size, (ctx) => {
          this._draw(ctx, d, size);
        });
      }, 20);
    },

    _draw(ctx, d, size) {
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 10;

      // Clock face
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFDF5';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Minute ticks
      for (let i = 0; i < 60; i++) {
        const angle = (i * 6 - 90) * Math.PI / 180;
        const isMajor = i % 5 === 0;
        const outerR = r - 3;
        const innerR = isMajor ? r - 14 : r - 8;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = isMajor ? 2 : 0.8;
        ctx.stroke();
      }

      // Hour numbers
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let h = 1; h <= 12; h++) {
        const angle = (h * 30 - 90) * Math.PI / 180;
        const numR = r - 24;
        ctx.fillText(String(h), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();

      const hour = d.hour;
      const minute = d.minute || 0;

      // Hour hand
      const hourAngle = ((hour % 12) * 30 + minute * 0.5 - 90) * Math.PI / 180;
      const hourLen = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hourAngle) * hourLen, cy + Math.sin(hourAngle) * hourLen);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Minute hand
      const minuteAngle = (minute * 6 - 90) * Math.PI / 180;
      const minuteLen = r * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(minuteAngle) * minuteLen, cy + Math.sin(minuteAngle) * minuteLen);
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add components/clock-view/
git commit -m "feat: add clock-view Canvas 2D component"
```

---

### Task 7: Create `<data-table>` component

**Files:**
- Create: `components/data-table/data-table.js`
- Create: `components/data-table/data-table.wxml`
- Create: `components/data-table/data-table.wxss`
- Create: `components/data-table/data-table.json`

- [ ] **Step 1: Create data-table.json**

```json
{
  "component": true,
  "usingComponents": {}
}
```

- [ ] **Step 2: Create data-table.wxml**

```xml
<view class="data-table-wrap" wx:if="{{tableData}}">
  <text class="table-title" wx:if="{{tableData.title}}">{{tableData.title}}</text>
  <scroll-view scroll-x class="table-scroll">
    <view class="table">
      <view class="table-row table-header">
        <view class="table-cell header-cell" wx:for="{{tableData.headers}}" wx:key="index">
          <text>{{item}}</text>
        </view>
      </view>
      <view class="table-row" wx:for="{{tableData.rows}}" wx:key="index" wx:for-item="row">
        <view class="table-cell" wx:for="{{row}}" wx:key="index" wx:for-item="cell">
          <text>{{cell}}</text>
        </view>
      </view>
    </view>
  </scroll-view>
</view>
```

- [ ] **Step 3: Create data-table.wxss**

```css
.data-table-wrap {
  margin: 16rpx 0;
}

.table-title {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 12rpx;
}

.table-scroll {
  width: 100%;
}

.table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  border: 1rpx solid #ddd;
}

.table-row {
  display: table-row;
}

.table-cell {
  display: table-cell;
  padding: 12rpx 16rpx;
  border: 1rpx solid #ddd;
  text-align: center;
  font-size: 26rpx;
  color: #333;
  vertical-align: middle;
}

.header-cell {
  background: #f0f4f8;
  font-weight: bold;
  color: #444;
}
```

- [ ] **Step 4: Create data-table.js**

```javascript
Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    tableData: null
  },

  lifetimes: {
    attached() { this._process(); }
  },

  methods: {
    _onDataChange() { this._process(); },

    _process() {
      const d = this.data.data;
      if (!d || !d.headers || !d.rows) {
        this.setData({ tableData: null });
        return;
      }
      this.setData({ tableData: d });
    }
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add components/data-table/
git commit -m "feat: add data-table WXML/CSS component"
```

---

### Task 8: Create `<shape-2d>` component (refactored from geometry-canvas)

**Files:**
- Create: `components/shape-2d/shape-2d.js`
- Create: `components/shape-2d/shape-2d.wxml`
- Create: `components/shape-2d/shape-2d.wxss`
- Create: `components/shape-2d/shape-2d.json`

- [ ] **Step 1: Create shape-2d.json, .wxml, .wxss**

shape-2d.json:
```json
{
  "component": true,
  "usingComponents": {}
}
```

shape-2d.wxml:
```xml
<view class="shape-2d-wrap" style="width:100%; height:{{canvasHeight}}px;">
  <canvas type="2d" id="shape2dCanvas" class="shape-2d-canvas" style="width:{{canvasWidth}}px;height:{{canvasHeight}}px;"></canvas>
</view>
```

shape-2d.wxss:
```css
.shape-2d-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.shape-2d-canvas {
  display: block;
}
```

- [ ] **Step 2: Create shape-2d.js**

This component supports two modes:
- **High-level mode**: `data.shape` + `data.dimensions` — auto-generates shapes/labels
- **Low-level mode**: `data.shapes` array — direct draw (ported from geometry-canvas 2D code)

```javascript
const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

// ===== Helper functions (from geometry-canvas) =====
function norm(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function perpendicular(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return norm([-dy, dx]);
}

// ===== High-level shape → low-level shapes converter =====
function shapeToShapes(data) {
  const s = data.shape;
  const dim = data.dimensions || {};
  const W = 250;
  const H = 180;
  const cx = W / 2;
  const cy = H / 2;
  const shapes = [];
  const labels = data.labels ? data.labels.slice() : [];

  switch (s) {
    case 'rectangle': {
      const l = dim.length || 80;
      const w = dim.width || 50;
      const scale = Math.min((W - 40) / l, (H - 40) / w);
      const sl = l * scale;
      const sw = w * scale;
      const x0 = cx - sl / 2, y0 = cy - sw / 2;
      shapes.push({ type: 'polygon', points: [[x0, y0], [x0 + sl, y0], [x0 + sl, y0 + sw], [x0, y0 + sw]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: l + '', position: [cx, y0 + sw + 14], fontSize: 12 });
        labels.push({ text: w + '', position: [x0 - 14, cy], fontSize: 12 });
      }
      break;
    }
    case 'square': {
      const side = dim.side || 60;
      const scale = Math.min((W - 40) / side, (H - 40) / side);
      const ss = side * scale;
      const x0 = cx - ss / 2, y0 = cy - ss / 2;
      shapes.push({ type: 'polygon', points: [[x0, y0], [x0 + ss, y0], [x0 + ss, y0 + ss], [x0, y0 + ss]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: side + '', position: [cx, y0 + ss + 14], fontSize: 12 });
      }
      break;
    }
    case 'circle': {
      const r = dim.radius || 50;
      const scale = Math.min((W - 40) / (r * 2), (H - 40) / (r * 2));
      const sr = r * scale;
      shapes.push({ type: 'circle', center: [cx, cy], radius: sr, stroke: '#333' });
      // radius line
      shapes.push({ type: 'line', from: [cx, cy], to: [cx + sr, cy], stroke: '#4A90E2' });
      if (!labels.length) {
        labels.push({ text: 'r=' + r, position: [cx + sr / 2, cy - 10], fontSize: 11, color: '#4A90E2' });
      }
      break;
    }
    case 'triangle': {
      const base = dim.base || 80;
      const height = dim.height || 60;
      const scale = Math.min((W - 40) / base, (H - 40) / height);
      const sb = base * scale;
      const sh = height * scale;
      const x0 = cx - sb / 2, y0 = cy + sh / 2;
      shapes.push({ type: 'polygon', points: [[x0, y0], [x0 + sb, y0], [cx, y0 - sh]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: base + '', position: [cx, y0 + 14], fontSize: 12 });
        labels.push({ text: 'h=' + height, position: [cx + 10, cy], fontSize: 11, color: '#999' });
      }
      // height dashed line
      shapes.push({ type: 'dashed', from: [cx, y0 - sh], to: [cx, y0], stroke: '#999' });
      break;
    }
    case 'parallelogram': {
      const base = dim.base || 80;
      const height = dim.height || 50;
      const offset = 25;
      const scale = Math.min((W - 40) / (base + offset), (H - 40) / height);
      const sb = base * scale;
      const sh = height * scale;
      const so = offset * scale;
      const x0 = cx - (sb + so) / 2, y0 = cy + sh / 2;
      shapes.push({ type: 'polygon', points: [[x0 + so, y0 - sh], [x0 + so + sb, y0 - sh], [x0 + sb, y0], [x0, y0]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: base + '', position: [cx, y0 + 14], fontSize: 12 });
      }
      break;
    }
    case 'trapezoid': {
      const top = dim.top || 40;
      const base = dim.base || 80;
      const height = dim.height || 50;
      const scale = Math.min((W - 40) / base, (H - 40) / height);
      const sb = base * scale;
      const st = top * scale;
      const sh = height * scale;
      const x0 = cx - sb / 2, y0 = cy + sh / 2;
      const tx0 = cx - st / 2;
      shapes.push({ type: 'polygon', points: [[tx0, y0 - sh], [tx0 + st, y0 - sh], [x0 + sb, y0], [x0, y0]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: top + '', position: [cx, y0 - sh - 14], fontSize: 12 });
        labels.push({ text: base + '', position: [cx, y0 + 14], fontSize: 12 });
      }
      break;
    }
    case 'sector': {
      const r = dim.radius || 60;
      const angle = dim.angle || 90;
      const scale = Math.min((W - 40) / (r * 2), (H - 40) / (r * 2));
      const sr = r * scale;
      shapes.push({ type: 'line', from: [cx, cy], to: [cx + sr, cy], stroke: '#333' });
      const endRad = -angle * Math.PI / 180;
      shapes.push({ type: 'line', from: [cx, cy], to: [cx + sr * Math.cos(endRad), cy + sr * Math.sin(endRad)], stroke: '#333' });
      shapes.push({ type: 'arc', center: [cx, cy], radius: sr, startAngle: -angle, endAngle: 0, stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: angle + '°', position: [cx + 20, cy - 10], fontSize: 11 });
      }
      break;
    }
    default:
      break;
  }
  return { width: W, height: H, shapes, labels, annotations: [] };
}

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      let d = this.data.data;
      if (!d) return;

      // High-level mode: convert shape+dimensions to low-level format
      if (d.shape && !d.shapes) {
        d = shapeToShapes(d);
      }

      if (!d.shapes || !d.shapes.length) return;

      const containerWidth = getContainerWidth();
      const scale = containerWidth / d.width;
      const canvasWidth = Math.floor(d.width * scale);
      const canvasHeight = Math.floor(d.height * scale);
      this.setData({ canvasWidth, canvasHeight });
      this._diagramData = d;
      this._scale = scale;

      setTimeout(() => {
        initCanvas(this, 'shape2dCanvas', canvasWidth, canvasHeight, (ctx) => {
          ctx.scale(scale, scale);
          this._drawShapes(ctx, d.shapes);
          this._drawAnnotations(ctx, d.annotations || []);
          this._drawLabels(ctx, d.labels || []);
          ctx.restore();
        });
      }, 20);
    },

    // ===== 2D Shape Drawing (ported from geometry-canvas) =====

    _drawShapes(ctx, shapes) {
      for (const s of shapes) {
        switch (s.type) {
          case 'polygon': this._drawPolygon(ctx, s); break;
          case 'circle':  this._drawCircle(ctx, s); break;
          case 'line':    this._drawLine(ctx, s); break;
          case 'arc':     this._drawArc(ctx, s); break;
          case 'dashed':  this._drawDashed(ctx, s); break;
          default: break;
        }
      }
    },

    _drawPolygon(ctx, s) {
      const pts = s.points;
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawCircle(ctx, s) {
      ctx.beginPath();
      ctx.arc(s.center[0], s.center[1], s.radius, 0, Math.PI * 2);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawLine(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s.from[0], s.from[1]);
      ctx.lineTo(s.to[0], s.to[1]);
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawArc(ctx, s) {
      const start = (s.startAngle || 0) * Math.PI / 180;
      const end = (s.endAngle || 360) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(s.center[0], s.center[1], s.radius, start, end);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawDashed(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s.from[0], s.from[1]);
      ctx.lineTo(s.to[0], s.to[1]);
      ctx.strokeStyle = s.stroke || '#999';
      ctx.lineWidth = s.lineWidth || 1;
      ctx.setLineDash(s.dash || [4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    // ===== Annotations (ported from geometry-canvas) =====

    _drawAnnotations(ctx, annotations) {
      for (const a of annotations) {
        switch (a.type) {
          case 'rightAngle':    this._drawRightAngle(ctx, a); break;
          case 'shade':         this._drawShade(ctx, a); break;
          case 'arrow':         this._drawArrow(ctx, a); break;
          case 'parallel':      this._drawParallel(ctx, a); break;
          case 'equal':         this._drawEqual(ctx, a); break;
          case 'dimensionLine': this._drawDimensionLine(ctx, a); break;
          default: break;
        }
      }
    },

    _drawRightAngle(ctx, a) {
      const v = a.vertex;
      const sz = a.size || 8;
      const d1 = norm(a.dir1);
      const d2 = norm(a.dir2);
      const p1 = [v[0] + d1[0] * sz, v[1] + d1[1] * sz];
      const corner = [v[0] + d1[0] * sz + d2[0] * sz, v[1] + d1[1] * sz + d2[1] * sz];
      const p2 = [v[0] + d2[0] * sz, v[1] + d2[1] * sz];
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(corner[0], corner[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = a.stroke || '#333';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawShade(ctx, a) {
      const pts = a.points;
      if (!pts || pts.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = a.fill || 'rgba(100,150,255,0.2)';
      ctx.fill();
    },

    _drawArrow(ctx, a) {
      const from = a.from;
      const to = a.to;
      const stroke = a.stroke || '#333';
      const headLen = a.headLength || 8;
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      ctx.beginPath();
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(to[0] - headLen * Math.cos(angle - Math.PI / 6), to[1] - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to[0] - headLen * Math.cos(angle + Math.PI / 6), to[1] - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = stroke;
      ctx.fill();
    },

    _drawParallel(ctx, a) {
      const mid = midpoint(a.from, a.to);
      const dir = norm([a.to[0] - a.from[0], a.to[1] - a.from[1]]);
      const perp = perpendicular(a.from, a.to);
      const sz = 5;
      const arrowTip = [mid[0] + dir[0] * sz, mid[1] + dir[1] * sz];
      const wing1 = [mid[0] - dir[0] * sz * 0.3 + perp[0] * sz * 0.5, mid[1] - dir[1] * sz * 0.3 + perp[1] * sz * 0.5];
      const wing2 = [mid[0] - dir[0] * sz * 0.3 - perp[0] * sz * 0.5, mid[1] - dir[1] * sz * 0.3 - perp[1] * sz * 0.5];
      ctx.beginPath();
      ctx.moveTo(arrowTip[0], arrowTip[1]);
      ctx.lineTo(wing1[0], wing1[1]);
      ctx.moveTo(arrowTip[0], arrowTip[1]);
      ctx.lineTo(wing2[0], wing2[1]);
      ctx.strokeStyle = a.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawEqual(ctx, a) {
      const mid = midpoint(a.from, a.to);
      const perp = perpendicular(a.from, a.to);
      const dir = norm([a.to[0] - a.from[0], a.to[1] - a.from[1]]);
      const count = a.count || 1;
      const tickLen = 4;
      const gap = 3;
      ctx.strokeStyle = a.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * gap;
        const center = [mid[0] + dir[0] * offset, mid[1] + dir[1] * offset];
        ctx.beginPath();
        ctx.moveTo(center[0] + perp[0] * tickLen, center[1] + perp[1] * tickLen);
        ctx.lineTo(center[0] - perp[0] * tickLen, center[1] - perp[1] * tickLen);
        ctx.stroke();
      }
    },

    _drawDimensionLine(ctx, a) {
      const from = a.from;
      const to = a.to;
      const offset = a.offset || 15;
      const perp = perpendicular(from, to);
      const p1 = [from[0] + perp[0] * offset, from[1] + perp[1] * offset];
      const p2 = [to[0] + perp[0] * offset, to[1] + perp[1] * offset];
      const stroke = a.stroke || '#666';
      // Extension lines
      ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(to[0], to[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
      // Dimension line with arrows
      this._drawArrow(ctx, { from: p1, to: p2, stroke, headLength: 5 });
      this._drawArrow(ctx, { from: p2, to: p1, stroke, headLength: 5 });
      // Text label
      if (a.text) {
        const mid2 = midpoint(p1, p2);
        ctx.save();
        ctx.fillStyle = '#fff';
        const textW = ctx.measureText(a.text).width;
        ctx.fillRect(mid2[0] - textW / 2 - 2, mid2[1] - 6, textW + 4, 12);
        ctx.fillStyle = stroke;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.text, mid2[0], mid2[1]);
        ctx.restore();
      }
    },

    // ===== Labels =====

    _drawLabels(ctx, labels) {
      for (const l of labels) {
        const fontSize = l.fontSize || 12;
        ctx.font = (l.bold ? 'bold ' : '') + fontSize + 'px sans-serif';
        ctx.fillStyle = l.color || '#333';
        ctx.textAlign = l.align || 'center';
        ctx.textBaseline = l.baseline || 'middle';
        ctx.fillText(l.text, l.position[0], l.position[1]);
      }
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add components/shape-2d/
git commit -m "feat: add shape-2d component (refactored from geometry-canvas 2D)"
```

---

### Task 9: Create `<shape-3d>` component (refactored from geometry-canvas)

**Files:**
- Create: `components/shape-3d/shape-3d.js`
- Create: `components/shape-3d/shape-3d.wxml`
- Create: `components/shape-3d/shape-3d.wxss`
- Create: `components/shape-3d/shape-3d.json`

- [ ] **Step 1: Create shape-3d.json, .wxml, .wxss**

shape-3d.json:
```json
{
  "component": true,
  "usingComponents": {}
}
```

shape-3d.wxml:
```xml
<view class="shape-3d-wrap" style="width:100%; height:{{canvasHeight}}px;">
  <canvas type="2d" id="shape3dCanvas" class="shape-3d-canvas" style="width:{{canvasWidth}}px;height:{{canvasHeight}}px;"></canvas>
</view>
```

shape-3d.wxss:
```css
.shape-3d-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.shape-3d-canvas {
  display: block;
}
```

- [ ] **Step 2: Create shape-3d.js**

Supports two modes:
- **High-level mode**: `data.shape` + `data.dimensions` + `data.viewType` — auto-generates 3D draw commands
- **Low-level mode**: `data.shapes` array with cuboid/cube/cylinder/cone/sphere types — direct draw (ported from geometry-canvas)

```javascript
const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

function iso(origin, lx, ly, lz) {
  return [
    origin[0] + (lx - ly) * COS30,
    origin[1] - lz + (lx + ly) * SIN30 * 0.5
  ];
}

function norm(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function perpendicular(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return norm([-dy, dx]);
}

// Convert high-level shape spec to low-level shapes array
function shapeToShapes3d(data) {
  const dim = data.dimensions || {};
  const shape = data.shape;
  const W = 250;
  const H = 200;
  const origin = data.origin || [60, H - 30];
  const shapes = [];
  const labels = [];

  switch (shape) {
    case 'cuboid':
      shapes.push({
        type: 'cuboid', origin, length: dim.length || 80, width: dim.width || 50, height: dim.height || 60,
        stroke: '#333', hiddenEdges: data.hiddenEdges !== false, faceFills: data.faceFills || []
      });
      break;
    case 'cube': {
      const s = dim.length || dim.side || 60;
      shapes.push({ type: 'cube', origin, size: s, stroke: '#333', hiddenEdges: data.hiddenEdges !== false, faceFills: data.faceFills || [] });
      break;
    }
    case 'cylinder':
      shapes.push({ type: 'cylinder', origin, radius: dim.radius || 40, height: dim.height || 80, stroke: '#333' });
      break;
    case 'cone':
      shapes.push({ type: 'cone', origin, radius: dim.radius || 40, height: dim.height || 80, stroke: '#333' });
      break;
    case 'sphere':
      shapes.push({ type: 'sphere', center: [W / 2, H / 2], radius: dim.radius || 50, stroke: '#333' });
      break;
    default:
      break;
  }
  return { width: W, height: H, shapes, labels, annotations: [] };
}

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      let d = this.data.data;
      if (!d) return;

      // High-level mode
      if (d.shape && !d.shapes) {
        d = shapeToShapes3d(d);
      }

      if (!d.shapes || !d.shapes.length) return;

      const containerWidth = getContainerWidth();
      const scale = containerWidth / d.width;
      const canvasWidth = Math.floor(d.width * scale);
      const canvasHeight = Math.floor(d.height * scale);
      this.setData({ canvasWidth, canvasHeight });

      setTimeout(() => {
        initCanvas(this, 'shape3dCanvas', canvasWidth, canvasHeight, (ctx) => {
          ctx.scale(scale, scale);
          this._drawShapes(ctx, d.shapes);
          this._drawAnnotations(ctx, d.annotations || []);
          this._drawLabels(ctx, d.labels || []);
          ctx.restore();
        });
      }, 20);
    },

    _drawShapes(ctx, shapes) {
      for (const s of shapes) {
        switch (s.type) {
          case 'cuboid':   this._drawCuboid(ctx, s); break;
          case 'cube':     this._drawCube(ctx, s); break;
          case 'cylinder': this._drawCylinder(ctx, s); break;
          case 'cone':     this._drawCone(ctx, s); break;
          case 'sphere':   this._drawSphere(ctx, s); break;
          default: break;
        }
      }
    },

    _cuboidVertices(origin, l, w, h) {
      return {
        fbl: iso(origin, 0, 0, 0), fbr: iso(origin, l, 0, 0),
        bbl: iso(origin, 0, w, 0), bbr: iso(origin, l, w, 0),
        ftl: iso(origin, 0, 0, h), ftr: iso(origin, l, 0, h),
        btl: iso(origin, 0, w, h), btr: iso(origin, l, w, h),
      };
    },

    _strokeEdge(ctx, a, b, stroke, dashed) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke(); ctx.setLineDash([]);
    },

    _fillFace(ctx, pts, fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    },

    _drawCuboid(ctx, s) {
      const v = this._cuboidVertices(s.origin, s.length, s.width, s.height);
      const stroke = s.stroke || '#333';
      const showHidden = s.hiddenEdges !== false;
      const faces = {
        front: [v.fbl, v.fbr, v.ftr, v.ftl], right: [v.fbr, v.bbr, v.btr, v.ftr],
        top: [v.ftl, v.ftr, v.btr, v.btl], back: [v.bbl, v.bbr, v.btr, v.btl],
        left: [v.fbl, v.bbl, v.btl, v.ftl], bottom: [v.fbl, v.fbr, v.bbr, v.bbl],
      };
      if (s.fill) {
        this._fillFace(ctx, faces.top, s.fill);
        this._fillFace(ctx, faces.front, s.fill);
        this._fillFace(ctx, faces.right, s.fill);
      }
      if (s.faceFills) {
        for (const ff of s.faceFills) {
          if (faces[ff.face]) this._fillFace(ctx, faces[ff.face], ff.fill);
        }
      }
      this._strokeEdge(ctx, v.fbl, v.fbr, stroke, false);
      this._strokeEdge(ctx, v.fbr, v.ftr, stroke, false);
      this._strokeEdge(ctx, v.ftr, v.ftl, stroke, false);
      this._strokeEdge(ctx, v.ftl, v.fbl, stroke, false);
      this._strokeEdge(ctx, v.ftl, v.btl, stroke, false);
      this._strokeEdge(ctx, v.ftr, v.btr, stroke, false);
      this._strokeEdge(ctx, v.btl, v.btr, stroke, false);
      this._strokeEdge(ctx, v.fbr, v.bbr, stroke, false);
      this._strokeEdge(ctx, v.bbr, v.btr, stroke, false);
      if (showHidden) {
        this._strokeEdge(ctx, v.bbl, v.bbr, stroke, true);
        this._strokeEdge(ctx, v.bbl, v.fbl, stroke, true);
        this._strokeEdge(ctx, v.bbl, v.btl, stroke, true);
      }
    },

    _drawCube(ctx, s) {
      this._drawCuboid(ctx, { ...s, type: 'cuboid', length: s.size, width: s.size, height: s.size });
    },

    _drawEllipse(ctx, cx, cy, rx, ry, startAngle, endAngle, stroke, dashed, fill) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#333'; ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke(); ctx.setLineDash([]);
    },

    _drawCylinder(ctx, s) {
      const cx = s.origin[0]; const cy = s.origin[1];
      const r = s.radius; const h = s.height;
      const stroke = s.stroke || '#333'; const ry = r * 0.35;
      if (s.fill) {
        ctx.beginPath(); ctx.ellipse(cx, cy - h, r, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx - r, cy - h);
        ctx.ellipse(cx, cy - h, r, ry, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(cx + r, cy); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      this._drawEllipse(ctx, cx, cy, r, ry, 0, Math.PI, stroke, false);
      this._drawEllipse(ctx, cx, cy, r, ry, Math.PI, Math.PI * 2, stroke, true);
      this._drawEllipse(ctx, cx, cy - h, r, ry, 0, Math.PI * 2, stroke, false);
      this._strokeEdge(ctx, [cx - r, cy], [cx - r, cy - h], stroke, false);
      this._strokeEdge(ctx, [cx + r, cy], [cx + r, cy - h], stroke, false);
    },

    _drawCone(ctx, s) {
      const cx = s.origin[0]; const cy = s.origin[1];
      const r = s.radius; const h = s.height;
      const stroke = s.stroke || '#333'; const ry = r * 0.35;
      const apex = [cx, cy - h];
      if (s.fill) {
        ctx.beginPath(); ctx.moveTo(apex[0], apex[1]);
        ctx.lineTo(cx - r, cy); ctx.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true);
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      this._drawEllipse(ctx, cx, cy, r, ry, 0, Math.PI, stroke, false);
      this._drawEllipse(ctx, cx, cy, r, ry, Math.PI, Math.PI * 2, stroke, true);
      this._strokeEdge(ctx, [cx - r, cy], apex, stroke, false);
      this._strokeEdge(ctx, [cx + r, cy], apex, stroke, false);
    },

    _drawSphere(ctx, s) {
      const cx = s.center[0]; const cy = s.center[1];
      const r = s.radius; const stroke = s.stroke || '#333';
      if (s.fill) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
      this._drawEllipse(ctx, cx, cy, r, r * 0.35, 0, Math.PI * 2, stroke, true);
    },

    // ===== Annotations & Labels (same as shape-2d) =====

    _drawAnnotations(ctx, annotations) {
      for (const a of annotations) {
        switch (a.type) {
          case 'dimensionLine': this._drawDimensionLine(ctx, a); break;
          default: break;
        }
      }
    },

    _drawDimensionLine(ctx, a) {
      const from = a.from; const to = a.to;
      const offset = a.offset || 15;
      const perp = perpendicular(from, to);
      const p1 = [from[0] + perp[0] * offset, from[1] + perp[1] * offset];
      const p2 = [to[0] + perp[0] * offset, to[1] + perp[1] * offset];
      const stroke = a.stroke || '#666';
      ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(to[0], to[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      // Simple line (no arrows for simplicity in 3D context)
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
      if (a.text) {
        const mid2 = midpoint(p1, p2);
        ctx.save();
        ctx.fillStyle = '#fff';
        const textW = ctx.measureText(a.text).width;
        ctx.fillRect(mid2[0] - textW / 2 - 2, mid2[1] - 6, textW + 4, 12);
        ctx.fillStyle = stroke; ctx.font = '10px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a.text, mid2[0], mid2[1]);
        ctx.restore();
      }
    },

    _drawLabels(ctx, labels) {
      for (const l of labels) {
        const fontSize = l.fontSize || 12;
        ctx.font = (l.bold ? 'bold ' : '') + fontSize + 'px sans-serif';
        ctx.fillStyle = l.color || '#333';
        ctx.textAlign = l.align || 'center';
        ctx.textBaseline = l.baseline || 'middle';
        ctx.fillText(l.text, l.position[0], l.position[1]);
      }
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add components/shape-3d/
git commit -m "feat: add shape-3d component (refactored from geometry-canvas 3D)"
```

---

### Task 10: Refactor number-line, fraction-bar, counting-blocks to unified `data` property

**Files:**
- Modify: `components/number-line/number-line.js`
- Modify: `components/number-line/number-line.wxml`
- Modify: `components/fraction-bar/fraction-bar.js`
- Modify: `components/fraction-bar/fraction-bar.wxml`
- Modify: `components/counting-blocks/counting-blocks.js`
- Modify: `components/counting-blocks/counting-blocks.wxml`

- [ ] **Step 1: Refactor number-line.js**

Replace the entire file. Change from multiple properties (start, end, step, highlightPoints, labels, width, height) to a single `data` object property.

```javascript
const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 320,
    canvasHeight: 80
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || d.start == null || d.end == null) return;

      const width = getContainerWidth();
      const height = 80;
      this.setData({ canvasWidth: width, canvasHeight: height });

      setTimeout(() => {
        initCanvas(this, 'numberLineCanvas', width, height, (ctx) => {
          this._draw(ctx, d, width, height);
        });
      }, 20);
    },

    _draw(ctx, d, width, height) {
      const start = d.start;
      const end = d.end;
      const step = d.step || 1;
      const highlightPoints = d.highlightPoints || [];
      const labels = d.labels || [];

      // Build points
      const points = [];
      for (let i = start; i <= end; i += step) {
        const isHighlighted = highlightPoints.some(p => p == i);
        const labelInfo = labels.find(l => l.position == i);
        points.push({
          value: i,
          isHighlighted,
          label: labelInfo ? labelInfo.text : null,
          labelAbove: labelInfo ? labelInfo.above : true
        });
      }

      const lineY = height / 2;

      // Main axis line
      ctx.beginPath();
      ctx.moveTo(10, lineY);
      ctx.lineTo(width - 10, lineY);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow
      ctx.beginPath();
      ctx.moveTo(width - 10, lineY);
      ctx.lineTo(width - 20, lineY - 5);
      ctx.lineTo(width - 20, lineY + 5);
      ctx.closePath();
      ctx.fillStyle = '#333';
      ctx.fill();

      // Tick positions
      const padding = 30;
      const axisWidth = width - padding * 2;
      const range = (end - start) / step;
      const tickGap = axisWidth / range;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      points.forEach((p, i) => {
        const x = padding + i * tickGap;

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(x, lineY - 8);
        ctx.lineTo(x, lineY + 8);
        ctx.strokeStyle = p.isHighlighted ? '#4A90E2' : '#666';
        ctx.lineWidth = p.isHighlighted ? 2 : 1;
        ctx.stroke();

        // Number
        ctx.font = p.isHighlighted ? 'bold 14px sans-serif' : '12px sans-serif';
        ctx.fillStyle = p.isHighlighted ? '#4A90E2' : '#333';
        ctx.fillText(p.value.toString(), x, lineY + 12);

        // Custom label
        if (p.label) {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#4A90E2';
          ctx.fillText(p.label, x, lineY - 22);
        }
      });

      ctx.restore();
    }
  }
});
```

- [ ] **Step 2: Update number-line.wxml**

```xml
<view class="number-line-container">
  <canvas type="2d" id="numberLineCanvas" class="number-line-canvas" style="width:{{canvasWidth}}px;height:{{canvasHeight}}px;"></canvas>
</view>
```

- [ ] **Step 3: Refactor fraction-bar.js**

```javascript
const { initCanvas } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 280,
    canvasHeight: 50
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.denominator) return;

      const width = 280;
      const height = 50;
      this.setData({ canvasWidth: width, canvasHeight: height });

      setTimeout(() => {
        initCanvas(this, 'fractionBarCanvas', width, height, (ctx) => {
          this._draw(ctx, d, width, height);
        });
      }, 20);
    },

    _draw(ctx, d, width, height) {
      const numerator = d.numerator || 0;
      const denominator = d.denominator;
      const color = d.color || '#4A90E2';

      const barHeight = 30;
      const barY = (height - barHeight) / 2;
      const unitWidth = width / denominator;

      for (let i = 0; i < denominator; i++) {
        const x = i * unitWidth;
        if (i < numerator) {
          ctx.fillStyle = color;
          ctx.fillRect(x + 1, barY + 1, unitWidth - 2, barHeight - 2);
        } else {
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, barY + 1, unitWidth - 2, barHeight - 2);
        }
      }

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(numerator + '/' + denominator, width / 2, height - 8);

      ctx.restore();
    }
  }
});
```

- [ ] **Step 4: Update fraction-bar.wxml**

```xml
<canvas type="2d" id="fractionBarCanvas" style="width: {{canvasWidth}}px; height: {{canvasHeight}}px;"></canvas>
```

- [ ] **Step 5: Refactor counting-blocks.js**

```javascript
const { initCanvas } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 280,
    canvasHeight: 80
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.count) return;

      const rows = d.rows || 2;
      const cols = d.cols || 5;
      const itemSize = 24;
      const gap = 4;
      const totalWidth = cols * itemSize + (cols - 1) * gap;
      const totalHeight = rows * itemSize + (rows - 1) * gap;
      this.setData({ canvasWidth: totalWidth, canvasHeight: totalHeight });

      setTimeout(() => {
        initCanvas(this, 'countingCanvas', totalWidth, totalHeight, (ctx) => {
          this._draw(ctx, d, totalWidth, totalHeight, rows, cols, itemSize, gap);
        });
      }, 20);
    },

    _draw(ctx, d, totalWidth, totalHeight, rows, cols, itemSize, gap) {
      const count = d.count;
      const color = d.color || '#4A90E2';
      const emptyColor = d.emptyColor || '#e0e0e0';

      let drawn = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * (itemSize + gap);
          const y = r * (itemSize + gap);
          ctx.beginPath();
          ctx.arc(x + itemSize / 2, y + itemSize / 2, itemSize / 2 - 1, 0, Math.PI * 2);
          if (drawn < count) {
            ctx.fillStyle = color;
            ctx.fill();
            drawn++;
          } else {
            ctx.strokeStyle = emptyColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }
  }
});
```

- [ ] **Step 6: Update counting-blocks.wxml**

```xml
<canvas type="2d" id="countingCanvas" style="width: {{canvasWidth}}px; height: {{canvasHeight}}px;"></canvas>
```

- [ ] **Step 7: Commit**

```bash
git add components/number-line/ components/fraction-bar/ components/counting-blocks/
git commit -m "refactor: unify number-line, fraction-bar, counting-blocks to single data property"
```

---

### Task 11: Update practice page to use chart-renderer

**Files:**
- Modify: `pages/practice/practice.wxml`
- Modify: `pages/practice/practice.json`
- Modify: `pages/practice/practice.js`

- [ ] **Step 1: Update practice.json**

Replace entire file:

```json
{
  "navigationBarTitleText": "练习中",
  "navigationBarBackgroundColor": "#FFFFFF",
  "navigationBarTextStyle": "black",
  "disableScroll": false,
  "usingComponents": {
    "duck-animation": "/components/duck-animation/duck-animation",
    "math-text": "/components/math-text/math-text",
    "math-input": "/components/math-input/math-input",
    "chart-renderer": "/components/chart-renderer/chart-renderer"
  }
}
```

- [ ] **Step 2: Update practice.wxml**

Replace lines 50-64 (the 4 conditional diagram/numberLine blocks) with a single chart-renderer:

Old code to remove (lines 50-64):
```xml
    <!-- 几何图形 -->
    <geometry-canvas wx:if="{{currentQuestion.diagram && currentQuestion.diagram.type === 'geometry'}}" diagram="{{currentQuestion.diagram}}" />
    <!-- 分数条 -->
    <fraction-bar wx:if="{{currentQuestion.diagram && currentQuestion.diagram.type === 'fractionBar'}}" numerator="{{currentQuestion.diagram.numerator}}" denominator="{{currentQuestion.diagram.denominator}}" />
    <!-- 计数块 -->
    <counting-blocks wx:if="{{currentQuestion.diagram && currentQuestion.diagram.type === 'countingBlocks'}}" count="{{currentQuestion.diagram.count}}" rows="{{currentQuestion.diagram.rows}}" cols="{{currentQuestion.diagram.cols}}" />
    <!-- 数轴 -->
    <number-line 
      wx:if="{{currentQuestion.numberLine}}" 
      start="{{currentQuestion.numberLine.start}}"
      end="{{currentQuestion.numberLine.end}}"
      step="{{currentQuestion.numberLine.step}}"
      highlightPoints="{{currentQuestion.numberLine.highlightPoints}}"
      labels="{{currentQuestion.numberLine.labels}}"
    />
```

Replace with:
```xml
    <!-- 图表渲染 -->
    <chart-renderer wx:if="{{currentQuestion.chartData}}" chartData="{{currentQuestion.chartData}}" />
```

- [ ] **Step 3: Update practice.js `formatSingleQuestion` method**

In `pages/practice/practice.js`, modify the `formatSingleQuestion` method (around line 225) to convert legacy `diagram`/`numberLine` to `chartData`, and also support new `chartData` directly:

Replace the `formatSingleQuestion` method:

```javascript
  formatSingleQuestion: function (q) {
    // Build unified chartData
    let chartData = q.chartData || null;

    // Legacy: convert diagram to chartData
    if (!chartData && q.diagram) {
      const d = q.diagram;
      if (d.type === 'geometry') {
        // Determine 2d vs 3d by checking shapes
        const has3d = (d.shapes || []).some(s => ['cuboid', 'cube', 'cylinder', 'cone', 'sphere'].includes(s.type));
        chartData = { chartType: has3d ? 'shape_3d' : 'shape_2d', data: d };
      } else if (d.type === 'fractionBar') {
        chartData = { chartType: 'fractionBar', data: { numerator: d.numerator, denominator: d.denominator } };
      } else if (d.type === 'countingBlocks') {
        chartData = { chartType: 'countingBlocks', data: { count: d.count, rows: d.rows, cols: d.cols } };
      }
    }

    // Legacy: convert numberLine to chartData
    if (!chartData && q.numberLine) {
      chartData = { chartType: 'numberLine', data: q.numberLine };
    }

    return {
      id: q.id || Date.now() + Math.random(),
      contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.content || q.question || '').trim() }],
      chartData: chartData,
      answer: String(q.answer || '').trim(),
      answerFormat: q.answerFormat || 'number',
      answerUnit: q.answerUnit || '',
      type: q.type || '计算题',
      typeName: q.type || '计算题',
      difficulty: this.getDifficultyLevel(q.difficulty),
      difficultyText: q.difficulty || '中等',
      hint: q.tip || '',
      solutionBlocks: q.solutionBlocks || (q.solution ? [{ type: 'text', value: String(q.solution).trim() }] : null),
      _bankId: q._bankId || null
    };
  },
```

- [ ] **Step 4: Update `processQuestions` method**

In `pages/practice/practice.js`, update the `processQuestions` method (around line 546) similarly:

```javascript
  processQuestions: function (data) {
    return data.map(q => {
      let chartData = q.chartData || null;
      if (!chartData && q.diagram) {
        const d = q.diagram;
        if (d.type === 'geometry') {
          const has3d = (d.shapes || []).some(s => ['cuboid', 'cube', 'cylinder', 'cone', 'sphere'].includes(s.type));
          chartData = { chartType: has3d ? 'shape_3d' : 'shape_2d', data: d };
        } else if (d.type === 'fractionBar') {
          chartData = { chartType: 'fractionBar', data: { numerator: d.numerator, denominator: d.denominator } };
        } else if (d.type === 'countingBlocks') {
          chartData = { chartType: 'countingBlocks', data: { count: d.count, rows: d.rows, cols: d.cols } };
        }
      }
      if (!chartData && q.numberLine) {
        chartData = { chartType: 'numberLine', data: q.numberLine };
      }

      return {
        id: q._id,
        contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.question || '').trim() }],
        chartData: chartData,
        answer: String(q.answer || '').trim(),
        answerFormat: q.answerFormat || 'number',
        answerUnit: q.answerUnit || '',
        type: q.type,
        typeName: this.getTypeName(q.type),
        difficulty: q.difficulty || 1,
        difficultyText: this.getDifficultyText(q.difficulty),
        hint: q.hint || '',
        solutionBlocks: q.solutionBlocks || (q.explanation ? [{ type: 'text', value: q.explanation }] : null),
      };
    });
  },
```

- [ ] **Step 5: Update `addToWrongQuestions` method**

In `pages/practice/practice.js`, update the `addToWrongQuestions` method (around line 776) to store `chartData` instead of `diagram`:

Replace `diagram: question.diagram,` with `chartData: question.chartData,` in the `db.collection('wrong_questions').add` call.

- [ ] **Step 6: Commit**

```bash
git add pages/practice/
git commit -m "refactor: update practice page to use chart-renderer with unified chartData"
```

---

### Task 12: Delete geometry-canvas component

**Files:**
- Delete: `components/geometry-canvas/geometry-canvas.js`
- Delete: `components/geometry-canvas/geometry-canvas.wxml`
- Delete: `components/geometry-canvas/geometry-canvas.wxss`
- Delete: `components/geometry-canvas/geometry-canvas.json`

- [ ] **Step 1: Verify no remaining references**

Run: `grep -r "geometry-canvas" pages/ components/ --include="*.json" --include="*.wxml" --include="*.js"`

Expected: No results (practice.json was already updated in Task 11).

If any references remain, update them before proceeding.

- [ ] **Step 2: Delete geometry-canvas**

```bash
rm -rf components/geometry-canvas/
```

- [ ] **Step 3: Commit**

```bash
git add -A components/geometry-canvas/
git commit -m "refactor: remove geometry-canvas, replaced by shape-2d and shape-3d"
```

---

### Task 13: Update cloud function — knowledge-to-chart mapping and prompt

**Files:**
- Modify: `cloudfunctions/generateQuestions/index.js`

- [ ] **Step 1: Replace `findDiagrams` and related constants with `findChartType`**

In `cloudfunctions/generateQuestions/index.js`, replace lines 123-162 (the `NEED_GEOMETRY_DIAGRAM`, `NEED_NUMBER_LINE`, `NEED_FRACTION_BAR` arrays and `findDiagrams` function) with:

```javascript
// 知识点 → chartType 映射
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
};

const findChartType = (knowledgeName) => {
  const kn = knowledgeName || '';
  for (const [keyword, chartType] of Object.entries(KNOWLEDGE_CHART_MAP)) {
    if (kn.includes(keyword)) return chartType;
  }
  return null;
};

// chartType 对应的 prompt 模板
const CHART_PROMPT_TEMPLATES = {
  bar: `"chartData": {"chartType":"bar","data":{"title":"图表标题","xAxis":["标签1","标签2","标签3"],"yAxisLabel":"单位","series":[{"name":"系列名","data":[12,8,10]}]}}
数据要合理，条数3-6个，数值为正整数。`,

  line: `"chartData": {"chartType":"line","data":{"title":"图表标题","xAxis":["1月","2月","3月","4月"],"yAxisLabel":"单位","series":[{"name":"系列名","data":[20,35,28,40]}]}}
数据点4-6个，展示变化趋势。`,

  pie: `"chartData": {"chartType":"pie","data":{"title":"图表标题","items":[{"label":"类别A","value":30},{"label":"类别B","value":25},{"label":"类别C","value":45}]}}
项目3-5个，value为正整数，总和不要求为100。`,

  clock: `"chartData": {"chartType":"clock","data":{"hour":3,"minute":30}}
hour为1-12整数，minute为0-59整数。题目围绕认识时间展开。`,

  table: `"chartData": {"chartType":"table","data":{"title":"统计表标题","headers":["项目","数量"],"rows":[["苹果",12],["香蕉",8]]}}
表格2-4列，2-5行数据。`,

  shape_2d: `"chartData": {"chartType":"shape_2d","data":{"shape":"rectangle","dimensions":{"length":8,"width":5},"labels":[{"text":"8cm","position":[125,155]},{"text":"5cm","position":[40,90]}]}}
shape可选：rectangle/square/circle/triangle/parallelogram/trapezoid/sector。dimensions按图形提供对应字段。`,

  shape_3d: `"chartData": {"chartType":"shape_3d","data":{"shape":"cuboid","dimensions":{"length":8,"width":5,"height":4},"viewType":"3d"}}
shape可选：cuboid/cube/cylinder/cone/sphere。viewType用"3d"。dimensions按图形类型提供。`,

  numberLine: `"chartData": {"chartType":"numberLine","data":{"start":0,"end":10,"step":1,"highlightPoints":[3,7],"labels":[{"position":3,"text":"A","above":true}]}}
数轴范围合理，step为正数，highlightPoints标记关键点。`,

  fractionBar: `"chartData": {"chartType":"fractionBar","data":{"numerator":3,"denominator":4}}
用分数条展示分数，numerator < denominator。`,
};
```

- [ ] **Step 2: Update `SYSTEM_PROMPT`**

In `SYSTEM_PROMPT`, replace lines 96-110 (the format rules section about diagram and numberLine):

Replace:
```
格式规范：
- contentBlocks用text类型写题目文字，简单表达式直接写在text里
- 只有复杂公式用latex类型（分数 \\frac{a}{b}、根号 \\sqrt{x}）
- 一二年级禁止使用latex！全部用text类型
- answerFormat：纯数字用number，分数答案用fraction，文字答案用text
- diagram设为null
- 数轴题用numberLine字段：{start,end,step,highlightPoints:[],labels:[]}
```

With:
```
格式规范：
- contentBlocks用text类型写题目文字，简单表达式直接写在text里
- 只有复杂公式用latex类型（分数 \\frac{a}{b}、根号 \\sqrt{x}）
- 一二年级禁止使用latex！全部用text类型
- answerFormat：纯数字用number，分数答案用fraction，文字答案用text
- chartData：不需要图表时设为null，需要图表时按指定格式输出
```

- [ ] **Step 3: Update `buildUserPrompt`**

Replace the `buildUserPrompt` function (lines 164-250) with:

```javascript
const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType, existingSummaries, prefetchHint } = params;
  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题', geometry: '几何题' };

  const chartType = findChartType(knowledgeName);

  let text = `生成${count}道${grade}「${knowledgeName}」${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。
严格限制在${grade}知识范围内，不得超纲。

输出JSON格式：
{"questions":[{
  "id": 1,
  "type": "${typeMap[questionType] || '计算题'}",
  "contentBlocks": [{"type":"text","value":"题目完整文字"}],
  "chartData": ${chartType ? '{}（按下面格式）' : 'null'},
  "answer": "答案",
  "answerFormat": "number",
  "answerUnit": "",
  "solutionBlocks": [{"type":"text","value":"解题步骤"}],
  "tip": "易错提示"
}]}`;

  if (chartType && CHART_PROMPT_TEMPLATES[chartType]) {
    text += `

【图表要求】本题需要chartData，chartType为"${chartType}"。
输出格式示例：
${CHART_PROMPT_TEMPLATES[chartType]}`;
  }

  if (Array.isArray(existingSummaries) && existingSummaries.length > 0) {
    text += `\n已出过的题（不要重复）：${existingSummaries.join('、')}`;
  }
  if (prefetchHint) {
    text += `\n出题要求变化：${prefetchHint}`;
  }
  return text;
};
```

- [ ] **Step 4: Update response parsing — `validateQuestion` and `parseResponse`**

Replace `validateDiagram`, `validateNumberLine`, and `validateQuestion` (lines 262-295) with:

```javascript
const VALID_CHART_TYPES = [
  'bar', 'line', 'pie', 'clock', 'table',
  'shape_2d', 'shape_3d',
  'numberLine', 'fractionBar', 'countingBlocks'
];

const validateChartData = (cd) => {
  if (!cd) return true; // null is valid (no chart)
  if (!cd.chartType || !VALID_CHART_TYPES.includes(cd.chartType)) return false;
  if (!cd.data || typeof cd.data !== 'object') return false;
  // Type-specific basic validation
  switch (cd.chartType) {
    case 'bar':
      return Array.isArray(cd.data.xAxis) && Array.isArray(cd.data.series);
    case 'line':
      return Array.isArray(cd.data.xAxis) && Array.isArray(cd.data.series);
    case 'pie':
      return Array.isArray(cd.data.items) && cd.data.items.length > 0;
    case 'clock':
      return typeof cd.data.hour === 'number';
    case 'table':
      return Array.isArray(cd.data.headers) && Array.isArray(cd.data.rows);
    case 'shape_2d':
      return (cd.data.shape || (Array.isArray(cd.data.shapes) && cd.data.shapes.length > 0));
    case 'shape_3d':
      return (cd.data.shape || (Array.isArray(cd.data.shapes) && cd.data.shapes.length > 0));
    case 'numberLine':
      return typeof cd.data.start === 'number' && typeof cd.data.end === 'number';
    case 'fractionBar':
      return typeof cd.data.denominator === 'number' && cd.data.denominator > 0;
    default:
      return true;
  }
};

const validateQuestion = (q) => {
  if (!validateContentBlocks(q.contentBlocks)) return false;
  if (!validateChartData(q.chartData)) return false;
  const allLatex = (q.contentBlocks || [])
    .concat(q.solutionBlocks || [])
    .filter(b => b.type === 'latex');
  return allLatex.every(b => validateLatexBrackets(b.value));
};
```

- [ ] **Step 5: Update `parseResponse` to extract `chartData`**

In the `parseResponse` function (lines 297-358), update the `.map()` block to extract `chartData` instead of `diagram`:

Replace the `.map((q, i) => { ... })` block (lines 311-338) with:

```javascript
    .map((q, i) => {
      let blocks = q.contentBlocks;
      if (!validateContentBlocks(blocks)) {
        const fallbackText = String(q.content || q.question || '').trim();
        blocks = fallbackText ? [{ type: 'text', value: fallbackText }] : null;
      }

      // Extract chartData (new unified field)
      let chartData = q.chartData || null;
      if (chartData && !validateChartData(chartData)) {
        console.warn('[parseResponse] chartData无效，已忽略:', JSON.stringify(chartData).slice(0, 80));
        chartData = null;
      }

      // Legacy fallback: convert old diagram/numberLine fields if present
      if (!chartData && q.diagram) {
        const d = q.diagram;
        if (d.type === 'geometry' && d.shapes) {
          const has3d = d.shapes.some(s => ['cuboid', 'cube', 'cylinder', 'cone', 'sphere'].includes(s.type));
          chartData = { chartType: has3d ? 'shape_3d' : 'shape_2d', data: d };
        } else if (d.type === 'fractionBar') {
          chartData = { chartType: 'fractionBar', data: { numerator: d.numerator, denominator: d.denominator } };
        } else if (d.type === 'countingBlocks') {
          chartData = { chartType: 'countingBlocks', data: { count: d.count, rows: d.rows, cols: d.cols } };
        }
      }
      if (!chartData && q.numberLine) {
        if (typeof q.numberLine.start === 'number' && typeof q.numberLine.end === 'number') {
          chartData = { chartType: 'numberLine', data: q.numberLine };
        }
      }

      let solution = q.solutionBlocks;
      if (!Array.isArray(solution) || solution.length === 0) {
        const solText = String(q.solution || q.explanation || '').trim();
        solution = solText ? [{ type: 'text', value: solText }] : [{ type: 'text', value: '略' }];
      }
      return {
        id: i + 1,
        type: q.type || '计算题',
        contentBlocks: blocks,
        chartData: chartData,
        answer: String(q.answer || '').trim(),
        answerFormat: q.answerFormat || 'number',
        answerUnit: q.answerUnit || '',
        solutionBlocks: solution,
        tip: String(q.tip || '').trim()
      };
    })
```

- [ ] **Step 6: Remove old validation functions**

Delete the now-unused `validateNumberLine` and `validateDiagram` functions and the `VALID_SHAPE_TYPES` constant (they have been replaced by `validateChartData` and `VALID_CHART_TYPES`).

- [ ] **Step 7: Commit**

```bash
git add cloudfunctions/generateQuestions/index.js
git commit -m "feat: update cloud function with chartData mapping, prompts, and parsing"
```

---

### Task 14: Final verification and cleanup

- [ ] **Step 1: Verify no stale references to geometry-canvas, diagram, or numberLine**

Run:
```bash
grep -r "geometry-canvas" pages/ components/ --include="*.json" --include="*.wxml" --include="*.js"
grep -r "\"diagram\"" pages/practice/ --include="*.wxml"
grep -r "numberLine" pages/practice/practice.wxml
```

Expected: No results for geometry-canvas or diagram/numberLine in wxml templates.

- [ ] **Step 2: Verify all component files exist**

Run:
```bash
ls components/chart-renderer/ components/bar-chart/ components/line-chart/ components/pie-chart/ components/clock-view/ components/data-table/ components/shape-2d/ components/shape-3d/ components/number-line/ components/fraction-bar/ components/counting-blocks/
```

Expected: Each directory contains .js, .wxml, .wxss, .json files.

- [ ] **Step 3: Verify geometry-canvas is deleted**

Run:
```bash
ls components/geometry-canvas/ 2>&1
```

Expected: "No such file or directory"

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git status
# If clean, no commit needed. If changes remain:
git add -A
git commit -m "chore: final cleanup for chart rendering phase 1"
```
