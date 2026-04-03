# 出题系统富内容渲染 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the quiz system in 「出题鸭」to render LaTeX formulas and 2D/3D geometry diagrams using native components, with enhanced answer input.

**Architecture:** Three new components (`math-text`, `geometry-canvas`, `math-input`) replace the plain-text rendering in the `practice` page. The `generateQuestions` cloud function gets new prompts for structured JSON output with `contentBlocks` + `diagram`. KaTeX is loaded via subpackage to keep the main bundle lean.

**Tech Stack:** WeChat Mini Program, `@rojer/katex-mini`, Canvas 2D API, Cloud Functions (Node.js + OpenAI-compatible API)

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `components/math-text/math-text.js` | Parse contentBlocks, convert LaTeX → rich-text nodes via katex-mini |
| `components/math-text/math-text.wxml` | Template: iterate blocks, render text/rich-text inline |
| `components/math-text/math-text.wxss` | Inline layout styles, KaTeX font sizing |
| `components/math-text/math-text.json` | Component config |
| `components/geometry-canvas/geometry-canvas.js` | Canvas 2D drawing engine: 2D shapes, 3D isometric shapes, annotations, labels |
| `components/geometry-canvas/geometry-canvas.wxml` | Canvas element with dynamic sizing |
| `components/geometry-canvas/geometry-canvas.wxss` | Canvas container styles |
| `components/geometry-canvas/geometry-canvas.json` | Component config |
| `components/math-input/math-input.js` | Answer input: number/fraction/text modes, emit normalized answer |
| `components/math-input/math-input.wxml` | Three input mode templates |
| `components/math-input/math-input.wxss` | Input styles, fraction layout |
| `components/math-input/math-input.json` | Component config |

### Modified files

| File | Changes |
|------|---------|
| `pages/practice/practice.js` | Rewrite `formatSingleQuestion`, `checkAnswer` (add fraction), `addToWrongQuestions` (store rich fields), `handleSubmit` (read from math-input event), remove `processQuestions` |
| `pages/practice/practice.wxml` | Replace `<text>` question rendering with `<math-text>`, add `<geometry-canvas>`, replace `<input>` with `<math-input>`, update feedback section to use `<math-text>` for explanations |
| `pages/practice/practice.wxss` | Add styles for geometry canvas container, adjust question-body for rich content |
| `pages/practice/practice.json` | Register 3 new components |
| `cloudfunctions/generateQuestions/index.js` | Rewrite `SYSTEM_PROMPT`, `buildUserPrompt` for structured JSON with contentBlocks/diagram/solutionBlocks, add `validateQuestion` for output validation, update `parseResponse` |
| `cloudfunctions/getQuestions/index.js` | Update `formatBankQuestion` to pass through rich fields, update `backfillAiQuestions` to store rich fields |
| `app.json` | Add `subPackages` for packagePractice, add `preloadRule` |
| `package.json` (root) | Add `@rojer/katex-mini` dependency |

---

## Task 1: Install KaTeX dependency and configure subpackage

**Files:**
- Modify: `app.json`
- Modify: `package.json` (root, if exists — otherwise create)

- [ ] **Step 1: Configure subpackage in app.json**

Replace the `pages` array entry for practice and add subPackages config. The practice page moves from main package to `packagePractice`.

In `app.json`, remove `"pages/practice/practice"` from the `pages` array. Then add `subPackages` and `preloadRule` keys:

```json
{
  "pages": [
    "pages/practice-select/practice-select",
    "pages/improve/improve",
    "pages/mine/mine",
    "pages/index/index",
    "pages/privacy/privacy",
    "pages/result/result"
  ],
  "subPackages": [
    {
      "root": "packagePractice",
      "pages": [
        "pages/practice/practice"
      ]
    }
  ],
  "preloadRule": {
    "pages/practice-select/practice-select": {
      "network": "all",
      "packages": ["packagePractice"]
    }
  },
  "window": { ... },
  "tabBar": { ... },
  "cloud": true,
  "style": "v2",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents",
  "requiredPrivateInfos": [],
  "networkTimeout": {
    "request": 30000,
    "downloadFile": 30000
  },
  "debug": false
}
```

- [ ] **Step 2: Move practice page files into subpackage directory**

```bash
mkdir -p packagePractice/pages/practice
mv pages/practice/practice.js packagePractice/pages/practice/
mv pages/practice/practice.wxml packagePractice/pages/practice/
mv pages/practice/practice.wxss packagePractice/pages/practice/
mv pages/practice/practice.json packagePractice/pages/practice/
```

- [ ] **Step 3: Install @rojer/katex-mini**

```bash
npm install @rojer/katex-mini
```

Then in WeChat DevTools: Menu → Tools → Build npm (构建 npm).

- [ ] **Step 4: Verify the app still loads**

Open WeChat DevTools, confirm:
- The practice-select page loads normally
- Navigating to practice page works (still shows old UI, that's fine)
- No console errors about missing pages

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: move practice page to subpackage, install katex-mini"
```

---

## Task 2: Create `math-text` component

**Files:**
- Create: `components/math-text/math-text.js`
- Create: `components/math-text/math-text.wxml`
- Create: `components/math-text/math-text.wxss`
- Create: `components/math-text/math-text.json`

- [ ] **Step 1: Create component JSON config**

Create `components/math-text/math-text.json`:

```json
{
  "component": true
}
```

- [ ] **Step 2: Create component JS**

Create `components/math-text/math-text.js`:

```javascript
const katexMini = require('@rojer/katex-mini');

Component({
  properties: {
    blocks: {
      type: Array,
      value: []
    }
  },

  observers: {
    'blocks': function(blocks) {
      if (!blocks || !blocks.length) {
        this.setData({ parsedBlocks: [] });
        return;
      }
      const parsedBlocks = blocks.map(block => {
        if (block.type === 'latex') {
          try {
            const nodes = katexMini.parse(block.value);
            return { type: 'latex', nodes: nodes };
          } catch (e) {
            console.error('[math-text] LaTeX parse error:', e.message, block.value);
            return { type: 'text', value: block.value };
          }
        }
        return { type: 'text', value: block.value || '' };
      });
      this.setData({ parsedBlocks });
    }
  },

  data: {
    parsedBlocks: []
  }
});
```

- [ ] **Step 3: Create component WXML**

Create `components/math-text/math-text.wxml`:

```xml
<view class="math-text-wrap">
  <block wx:for="{{parsedBlocks}}" wx:key="index">
    <text wx:if="{{item.type === 'text'}}" class="mt-text">{{item.value}}</text>
    <rich-text wx:elif="{{item.type === 'latex'}}" class="mt-latex" nodes="{{item.nodes}}"></rich-text>
  </block>
</view>
```

- [ ] **Step 4: Create component WXSS**

Create `components/math-text/math-text.wxss`:

```css
@import '/miniprogram_npm/@rojer/katex-mini/index.wxss';

.math-text-wrap {
  display: inline;
  line-height: 1.8;
  word-break: break-word;
}

.mt-text {
  display: inline;
  font-size: inherit;
  color: inherit;
  vertical-align: baseline;
}

.mt-latex {
  display: inline;
  vertical-align: middle;
}
```

- [ ] **Step 5: Quick smoke test**

In WeChat DevTools, temporarily add `math-text` to a test page, pass a simple block array:

```json
[{"type": "text", "value": "计算 "}, {"type": "latex", "value": "\\frac{1}{2} + \\frac{1}{3}"}]
```

Verify: text renders inline with the fraction formula. Then remove the test usage.

- [ ] **Step 6: Commit**

```bash
git add components/math-text/
git commit -m "feat: add math-text component for LaTeX formula rendering"
```

---

## Task 3: Create `geometry-canvas` component

**Files:**
- Create: `components/geometry-canvas/geometry-canvas.js`
- Create: `components/geometry-canvas/geometry-canvas.wxml`
- Create: `components/geometry-canvas/geometry-canvas.wxss`
- Create: `components/geometry-canvas/geometry-canvas.json`

- [ ] **Step 1: Create component JSON config**

Create `components/geometry-canvas/geometry-canvas.json`:

```json
{
  "component": true
}
```

- [ ] **Step 2: Create component WXML**

Create `components/geometry-canvas/geometry-canvas.wxml`:

```xml
<view class="geo-canvas-wrap" style="width:100%; height:{{canvasHeight}}px;">
  <canvas
    type="2d"
    id="geoCanvas"
    class="geo-canvas"
    style="width:{{canvasWidth}}px; height:{{canvasHeight}}px;"
  ></canvas>
</view>
```

- [ ] **Step 3: Create component WXSS**

Create `components/geometry-canvas/geometry-canvas.wxss`:

```css
.geo-canvas-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16rpx 0;
}

.geo-canvas {
  display: block;
}
```

- [ ] **Step 4: Create component JS — full drawing engine**

Create `components/geometry-canvas/geometry-canvas.js`:

```javascript
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

Component({
  properties: {
    diagram: {
      type: Object,
      value: null
    }
  },

  data: {
    canvasWidth: 200,
    canvasHeight: 200
  },

  observers: {
    'diagram': function(diagram) {
      if (diagram) {
        this.initCanvas(diagram);
      }
    }
  },

  lifetimes: {
    attached() {
      if (this.properties.diagram) {
        this.initCanvas(this.properties.diagram);
      }
    }
  },

  methods: {
    initCanvas(diagram) {
      const query = this.createSelectorQuery();
      query.select('.geo-canvas-wrap').boundingClientRect();
      query.exec((res) => {
        if (!res || !res[0]) return;
        const containerWidth = res[0].width;
        const dpr = wx.getWindowInfo().pixelRatio;
        const scale = containerWidth / diagram.width;
        const canvasWidth = Math.floor(containerWidth);
        const canvasHeight = Math.floor(diagram.height * scale);

        this.setData({ canvasWidth, canvasHeight }, () => {
          this.drawDiagram(diagram, scale, dpr);
        });
      });
    },

    drawDiagram(diagram, scale, dpr) {
      const query = this.createSelectorQuery();
      query.select('#geoCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          canvas.width = this.data.canvasWidth * dpr;
          canvas.height = this.data.canvasHeight * dpr;
          ctx.scale(dpr * scale, dpr * scale);

          this.drawShapes(ctx, diagram.shapes || []);
          this.drawAnnotations(ctx, diagram.annotations || []);
          this.drawLabels(ctx, diagram.labels || []);
        });
    },

    // ===== Shapes =====

    drawShapes(ctx, shapes) {
      shapes.forEach(s => {
        switch (s.type) {
          case 'polygon': this.drawPolygon(ctx, s); break;
          case 'circle': this.drawCircle(ctx, s); break;
          case 'line': this.drawLine(ctx, s); break;
          case 'arc': this.drawArc(ctx, s); break;
          case 'dashed': this.drawDashed(ctx, s); break;
          case 'cuboid': this.drawCuboid(ctx, s); break;
          case 'cube': this.drawCube(ctx, s); break;
          case 'cylinder': this.drawCylinder(ctx, s); break;
          case 'cone': this.drawCone(ctx, s); break;
          case 'sphere': this.drawSphere(ctx, s); break;
        }
      });
    },

    drawPolygon(ctx, s) {
      const pts = s.points;
      if (!pts || pts.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();
      if (s.fill && s.fill !== 'transparent') {
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    drawCircle(ctx, s) {
      ctx.beginPath();
      ctx.arc(s.center[0], s.center[1], s.radius, 0, Math.PI * 2);
      if (s.fill && s.fill !== 'transparent') {
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    drawLine(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s.from[0], s.from[1]);
      ctx.lineTo(s.to[0], s.to[1]);
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    drawArc(ctx, s) {
      ctx.beginPath();
      ctx.arc(s.center[0], s.center[1], s.radius, s.startAngle, s.endAngle);
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    drawDashed(ctx, s) {
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.moveTo(s.from[0], s.from[1]);
      ctx.lineTo(s.to[0], s.to[1]);
      ctx.strokeStyle = s.stroke || '#999';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    },

    // ===== 3D Isometric Shapes =====

    isoProject(origin, lx, ly, lz) {
      return [
        origin[0] + (lx - ly) * COS30,
        origin[1] - lz + (lx + ly) * SIN30 * 0.5
      ];
    },

    drawCuboid(ctx, s) {
      const o = s.origin;
      const l = s.length, w = s.width, h = s.height;
      const hiddenEdges = s.hiddenEdges !== false;

      const p = (lx, ly, lz) => this.isoProject(o, lx, ly, lz);

      const v = {
        fbl: p(0, 0, 0),     // front-bottom-left
        fbr: p(l, 0, 0),     // front-bottom-right
        ftl: p(0, 0, h),     // front-top-left
        ftr: p(l, 0, h),     // front-top-right
        bbl: p(0, w, 0),     // back-bottom-left
        bbr: p(l, w, 0),     // back-bottom-right
        btl: p(0, w, h),     // back-top-left
        btr: p(l, w, h),     // back-top-right
      };

      // Face fills
      if (s.faceFills) {
        const faceMap = {
          front: [v.fbl, v.fbr, v.ftr, v.ftl],
          back: [v.bbl, v.bbr, v.btr, v.btl],
          top: [v.ftl, v.ftr, v.btr, v.btl],
          bottom: [v.fbl, v.fbr, v.bbr, v.bbl],
          left: [v.fbl, v.bbl, v.btl, v.ftl],
          right: [v.fbr, v.bbr, v.btr, v.ftr],
        };
        s.faceFills.forEach(ff => {
          const pts = faceMap[ff.face];
          if (!pts) return;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
          ctx.fillStyle = ff.fill;
          ctx.fill();
        });
      }

      const stroke = s.stroke || '#333';

      // Visible edges (front face + top + right side)
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);

      const visibleEdges = [
        [v.fbl, v.fbr], [v.fbr, v.ftr], [v.ftr, v.ftl], [v.ftl, v.fbl],
        [v.ftr, v.btr], [v.fbr, v.bbr],
        [v.ftl, v.btl],
        [v.btl, v.btr], [v.bbr, v.btr],
      ];
      visibleEdges.forEach(([a, b]) => {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      });
      ctx.stroke();

      // Hidden edges
      if (hiddenEdges) {
        ctx.beginPath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        const hiddenEdgeList = [
          [v.bbl, v.bbr], [v.bbl, v.btl], [v.bbl, v.fbl],
        ];
        hiddenEdgeList.forEach(([a, b]) => {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },

    drawCube(ctx, s) {
      this.drawCuboid(ctx, {
        ...s,
        type: 'cuboid',
        length: s.size,
        width: s.size,
        height: s.size
      });
    },

    drawCylinder(ctx, s) {
      const o = s.origin;
      const r = s.radius, h = s.height;
      const stroke = s.stroke || '#333';
      const ry = r * 0.4;

      // Bottom ellipse (back half dashed)
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.ellipse(o[0], o[1], r, ry, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.ellipse(o[0], o[1], r, ry, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();

      // Side lines
      ctx.beginPath();
      ctx.moveTo(o[0] - r, o[1]);
      ctx.lineTo(o[0] - r, o[1] - h);
      ctx.moveTo(o[0] + r, o[1]);
      ctx.lineTo(o[0] + r, o[1] - h);
      ctx.stroke();

      // Top ellipse (full)
      ctx.beginPath();
      ctx.ellipse(o[0], o[1] - h, r, ry, 0, 0, 2 * Math.PI);
      if (s.fill && s.fill !== 'transparent') {
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    drawCone(ctx, s) {
      const o = s.origin;
      const r = s.radius, h = s.height;
      const stroke = s.stroke || '#333';
      const ry = r * 0.4;
      const apex = [o[0], o[1] - h];

      // Bottom ellipse back half dashed
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.ellipse(o[0], o[1], r, ry, 0, 0, Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bottom ellipse front half
      ctx.beginPath();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.ellipse(o[0], o[1], r, ry, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();

      // Side lines to apex
      ctx.beginPath();
      ctx.moveTo(o[0] - r, o[1]);
      ctx.lineTo(apex[0], apex[1]);
      ctx.moveTo(o[0] + r, o[1]);
      ctx.lineTo(apex[0], apex[1]);
      ctx.stroke();
    },

    drawSphere(ctx, s) {
      const c = s.center, r = s.radius;
      const stroke = s.stroke || '#333';

      // Outer circle
      ctx.beginPath();
      ctx.arc(c[0], c[1], r, 0, 2 * Math.PI);
      if (s.fill && s.fill !== 'transparent') {
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dashed equator ellipse
      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.ellipse(c[0], c[1], r, r * 0.35, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    },

    // ===== Annotations =====

    drawAnnotations(ctx, annotations) {
      annotations.forEach(a => {
        switch (a.type) {
          case 'rightAngle': this.drawRightAngle(ctx, a); break;
          case 'shade': this.drawShade(ctx, a); break;
          case 'arrow': this.drawArrow(ctx, a); break;
          case 'parallel': this.drawParallel(ctx, a); break;
          case 'equal': this.drawEqual(ctx, a); break;
          case 'dimensionLine': this.drawDimensionLine(ctx, a); break;
        }
      });
    },

    drawRightAngle(ctx, a) {
      const v = a.vertex;
      const sz = a.size || 12;
      const d1 = a.dir1 || [1, 0];
      const d2 = a.dir2 || [0, -1];

      ctx.beginPath();
      ctx.moveTo(v[0] + d1[0] * sz, v[1] + d1[1] * sz);
      ctx.lineTo(v[0] + d1[0] * sz + d2[0] * sz, v[1] + d1[1] * sz + d2[1] * sz);
      ctx.lineTo(v[0] + d2[0] * sz, v[1] + d2[1] * sz);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
    },

    drawShade(ctx, a) {
      const pts = a.points;
      if (!pts || pts.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = a.fill || 'rgba(0,0,0,0.1)';
      ctx.fill();
    },

    drawArrow(ctx, a) {
      const from = a.from, to = a.to;
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      const headLen = 8;

      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(to[0] - headLen * Math.cos(angle - 0.4), to[1] - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(to[0] - headLen * Math.cos(angle + 0.4), to[1] - headLen * Math.sin(angle + 0.4));
      ctx.stroke();
    },

    drawParallel(ctx, a) {
      const mx = (a.from[0] + a.to[0]) / 2;
      const my = (a.from[1] + a.to[1]) / 2;
      const angle = Math.atan2(a.to[1] - a.from[1], a.to[0] - a.from[0]);
      const sz = 6;
      const px = Math.cos(angle + Math.PI / 3) * sz;
      const py = Math.sin(angle + Math.PI / 3) * sz;

      ctx.beginPath();
      ctx.moveTo(mx - px - 3, my - py);
      ctx.lineTo(mx + px - 3, my + py);
      ctx.moveTo(mx - px + 3, my - py);
      ctx.lineTo(mx + px + 3, my + py);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
    },

    drawEqual(ctx, a) {
      const mx = (a.from[0] + a.to[0]) / 2;
      const my = (a.from[1] + a.to[1]) / 2;
      const angle = Math.atan2(a.to[1] - a.from[1], a.to[0] - a.from[0]);
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const count = a.count || 1;
      const gap = 4;

      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * gap;
        const cx = mx + Math.cos(angle) * offset;
        const cy = my + Math.sin(angle) * offset;
        ctx.moveTo(cx + perpX * 5, cy + perpY * 5);
        ctx.lineTo(cx - perpX * 5, cy - perpY * 5);
      }
      ctx.stroke();
    },

    drawDimensionLine(ctx, a) {
      const from = a.from, to = a.to;
      const offset = a.offset || 0;
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      const perpX = -Math.sin(angle) * offset;
      const perpY = Math.cos(angle) * offset;
      const f = [from[0] + perpX, from[1] + perpY];
      const t = [to[0] + perpX, to[1] + perpY];
      const tickLen = 5;

      ctx.beginPath();
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      // Main line
      ctx.moveTo(f[0], f[1]);
      ctx.lineTo(t[0], t[1]);
      // End ticks
      ctx.moveTo(f[0] - Math.sin(angle) * tickLen, f[1] + Math.cos(angle) * tickLen);
      ctx.lineTo(f[0] + Math.sin(angle) * tickLen, f[1] - Math.cos(angle) * tickLen);
      ctx.moveTo(t[0] - Math.sin(angle) * tickLen, t[1] + Math.cos(angle) * tickLen);
      ctx.lineTo(t[0] + Math.sin(angle) * tickLen, t[1] - Math.cos(angle) * tickLen);
      ctx.stroke();

      // Text
      if (a.text) {
        const mx = (f[0] + t[0]) / 2;
        const my = (f[1] + t[1]) / 2;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(a.text, mx, my - 4);
      }
    },

    // ===== Labels =====

    drawLabels(ctx, labels) {
      labels.forEach(lb => {
        ctx.font = `${lb.fontSize || 14}px sans-serif`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lb.text, lb.position[0], lb.position[1]);
      });
    }
  }
});
```

- [ ] **Step 5: Smoke test with a hardcoded triangle diagram**

Temporarily create a test page or add to an existing page:

```javascript
Page({
  data: {
    testDiagram: {
      type: "geometry",
      width: 200,
      height: 200,
      shapes: [
        { type: "polygon", points: [[20,170],[20,30],[160,170]], stroke: "#333", fill: "transparent" }
      ],
      labels: [
        { text: "A", position: [10, 20], fontSize: 14 },
        { text: "B", position: [10, 180], fontSize: 14 },
        { text: "C", position: [165, 180], fontSize: 14 }
      ],
      annotations: [
        { type: "rightAngle", vertex: [20,170], dir1: [0,-1], dir2: [1,0], size: 15 }
      ]
    }
  }
})
```

Verify: triangle renders correctly with right angle mark and vertex labels.

- [ ] **Step 6: Smoke test with a cuboid**

Test with:

```javascript
testCuboid: {
  type: "geometry",
  width: 250,
  height: 200,
  shapes: [{
    type: "cuboid",
    origin: [60, 160],
    length: 100, width: 60, height: 80,
    stroke: "#333", fill: "transparent",
    hiddenEdges: true,
    faceFills: [{ face: "front", fill: "rgba(66, 133, 244, 0.2)" }]
  }],
  labels: [
    { text: "10cm", position: [110, 172], fontSize: 12 },
    { text: "6cm", position: [185, 140], fontSize: 12 },
    { text: "8cm", position: [38, 115], fontSize: 12 }
  ],
  annotations: []
}
```

Verify: 3D cuboid renders with visible/hidden edges, front face fill, and labels.

- [ ] **Step 7: Commit**

```bash
git add components/geometry-canvas/
git commit -m "feat: add geometry-canvas component with 2D/3D drawing engine"
```

---

## Task 4: Create `math-input` component

**Files:**
- Create: `components/math-input/math-input.js`
- Create: `components/math-input/math-input.wxml`
- Create: `components/math-input/math-input.wxss`
- Create: `components/math-input/math-input.json`

- [ ] **Step 1: Create component JSON**

Create `components/math-input/math-input.json`:

```json
{
  "component": true
}
```

- [ ] **Step 2: Create component JS**

Create `components/math-input/math-input.js`:

```javascript
Component({
  properties: {
    format: {
      type: String,
      value: 'number'
    },
    unit: {
      type: String,
      value: ''
    }
  },

  data: {
    numberValue: '',
    numerator: '',
    denominator: '',
    textValue: ''
  },

  methods: {
    onNumberInput(e) {
      const val = e.detail.value.trim();
      this.setData({ numberValue: val });
      this.emitAnswer(val);
    },

    onNumeratorInput(e) {
      const val = e.detail.value.trim();
      this.setData({ numerator: val });
      this.emitFractionAnswer();
    },

    onDenominatorInput(e) {
      const val = e.detail.value.trim();
      this.setData({ denominator: val });
      this.emitFractionAnswer();
    },

    onTextInput(e) {
      const val = e.detail.value.trim();
      this.setData({ textValue: val });
      this.emitAnswer(val);
    },

    emitFractionAnswer() {
      const { numerator, denominator } = this.data;
      if (numerator && denominator) {
        this.emitAnswer(numerator + '/' + denominator);
      } else {
        this.emitAnswer('');
      }
    },

    emitAnswer(value) {
      this.triggerEvent('answer', { value });
    },

    reset() {
      this.setData({
        numberValue: '',
        numerator: '',
        denominator: '',
        textValue: ''
      });
    }
  }
});
```

- [ ] **Step 3: Create component WXML**

Create `components/math-input/math-input.wxml`:

```xml
<view class="math-input-wrap">
  <!-- Number mode -->
  <view class="input-row" wx:if="{{format === 'number'}}">
    <input
      class="num-input"
      type="digit"
      placeholder="输入答案"
      placeholder-class="input-placeholder"
      value="{{numberValue}}"
      bindinput="onNumberInput"
      confirm-type="done"
      adjust-position="{{false}}"
    />
    <text class="unit-text" wx:if="{{unit}}">{{unit}}</text>
  </view>

  <!-- Fraction mode -->
  <view class="fraction-row" wx:elif="{{format === 'fraction'}}">
    <view class="fraction-box">
      <input
        class="frac-input frac-num"
        type="digit"
        placeholder="分子"
        placeholder-class="frac-placeholder"
        value="{{numerator}}"
        bindinput="onNumeratorInput"
        confirm-type="next"
        adjust-position="{{false}}"
      />
      <view class="frac-line"></view>
      <input
        class="frac-input frac-den"
        type="digit"
        placeholder="分母"
        placeholder-class="frac-placeholder"
        value="{{denominator}}"
        bindinput="onDenominatorInput"
        confirm-type="done"
        adjust-position="{{false}}"
      />
    </view>
    <text class="unit-text" wx:if="{{unit}}">{{unit}}</text>
  </view>

  <!-- Text mode -->
  <view class="input-row" wx:elif="{{format === 'text'}}">
    <input
      class="text-input"
      type="text"
      placeholder="输入答案"
      placeholder-class="input-placeholder"
      value="{{textValue}}"
      bindinput="onTextInput"
      confirm-type="done"
      adjust-position="{{false}}"
    />
    <text class="unit-text" wx:if="{{unit}}">{{unit}}</text>
  </view>
</view>
```

- [ ] **Step 4: Create component WXSS**

Create `components/math-input/math-input.wxss`:

```css
.math-input-wrap {
  width: 100%;
}

.input-row {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border: 3rpx solid #E8E8E8;
  border-radius: 28rpx;
  padding: 4rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.input-row:focus-within {
  border-color: #FFB300;
  box-shadow: 0 0 0 4rpx rgba(255, 184, 0, 0.15);
}

.num-input,
.text-input {
  flex: 1;
  height: 110rpx;
  font-size: 56rpx;
  font-weight: 800;
  text-align: center;
  color: #D48806;
}

.input-placeholder {
  color: #D9D9D9;
  font-weight: 400;
  font-size: 36rpx;
}

.unit-text {
  font-size: 28rpx;
  color: #999;
  margin-left: 12rpx;
  flex-shrink: 0;
}

/* Fraction mode */
.fraction-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}

.fraction-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #FFFFFF;
  border: 3rpx solid #E8E8E8;
  border-radius: 28rpx;
  padding: 16rpx 40rpx;
  min-width: 200rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.fraction-box:focus-within {
  border-color: #FFB300;
  box-shadow: 0 0 0 4rpx rgba(255, 184, 0, 0.15);
}

.frac-input {
  width: 160rpx;
  height: 72rpx;
  font-size: 44rpx;
  font-weight: 800;
  text-align: center;
  color: #D48806;
}

.frac-placeholder {
  color: #D9D9D9;
  font-weight: 400;
  font-size: 28rpx;
}

.frac-line {
  width: 140rpx;
  height: 4rpx;
  background-color: #333;
  margin: 4rpx 0;
}
```

- [ ] **Step 5: Commit**

```bash
git add components/math-input/
git commit -m "feat: add math-input component with number/fraction/text modes"
```

---

## Task 5: Rewrite `practice` page to use new components

**Files:**
- Modify: `packagePractice/pages/practice/practice.json`
- Modify: `packagePractice/pages/practice/practice.wxml`
- Modify: `packagePractice/pages/practice/practice.wxss`
- Modify: `packagePractice/pages/practice/practice.js`

- [ ] **Step 1: Register new components in practice.json**

Replace `packagePractice/pages/practice/practice.json`:

```json
{
  "navigationBarTitleText": "练习中",
  "navigationBarBackgroundColor": "#FFFFFF",
  "navigationBarTextStyle": "black",
  "disableScroll": false,
  "usingComponents": {
    "duck-animation": "/components/duck-animation/duck-animation",
    "math-text": "/components/math-text/math-text",
    "geometry-canvas": "/components/geometry-canvas/geometry-canvas",
    "math-input": "/components/math-input/math-input"
  }
}
```

- [ ] **Step 2: Rewrite practice.wxml**

Replace `packagePractice/pages/practice/practice.wxml`:

```xml
<scroll-view
  class="practice-page"
  scroll-y
  enhanced
  show-scrollbar="{{false}}"
  scroll-into-view="{{scrollTarget}}"
  scroll-with-animation
  style="padding-bottom: {{keyboardHeight}}px;"
>

  <!-- 顶部进度区 -->
  <view class="progress-bar-section">
    <view class="progress-info">
      <view class="progress-left">
        <text class="progress-label">第</text>
        <text class="progress-num">{{currentIndex + 1}}</text>
        <text class="progress-label">题 / 共{{totalQuestions}}题</text>
      </view>
      <view class="score-badge">
        <text class="score-icon">⭐</text>
        <text class="score-val">{{score}}</text>
        <text class="score-label">分</text>
      </view>
    </view>
    <view class="progress-track">
      <view class="progress-fill" style="width: {{progressPercent}}%;"></view>
      <view class="progress-duck" style="left: calc({{progressPercent}}% - 20rpx);">
        <image src="/images/duck-avatar.png" mode="aspectFit" style="width:40rpx;height:40rpx;"></image>
      </view>
    </view>
  </view>

  <!-- 等待下一题 -->
  <view class="waiting-card" wx:if="{{waitingForNext}}">
    <image class="waiting-duck" src="/images/duck-avatar.png" mode="aspectFit"></image>
    <text class="waiting-text">下一题准备中...</text>
  </view>

  <!-- 题目卡片 -->
  <view class="question-card" wx:elif="{{currentQuestion}}">
    <view class="question-meta">
      <view class="type-tag">{{currentQuestion.typeName}}</view>
      <view class="diff-tag diff-{{currentQuestion.difficulty || 1}}">
        {{currentQuestion.difficultyText}}
      </view>
    </view>
    <view class="question-body">
      <math-text blocks="{{currentQuestion.contentBlocks}}" />
    </view>
    <!-- 几何图 -->
    <geometry-canvas wx:if="{{currentQuestion.diagram}}" diagram="{{currentQuestion.diagram}}" />
    <!-- 提示 -->
    <view class="hint-box" wx:if="{{showHint && currentQuestion.hint}}">
      <text class="hint-icon">💡</text>
      <text class="hint-text">{{currentQuestion.hint}}</text>
    </view>
  </view>

  <!-- 答题区 -->
  <view id="answerArea" class="answer-section" wx:if="{{currentQuestion && !waitingForNext}}">
    <text class="answer-label">写下你的答案</text>
    <math-input
      id="mathInput"
      format="{{currentQuestion.answerFormat || 'number'}}"
      unit="{{currentQuestion.answerUnit || ''}}"
      bind:answer="onAnswerInput"
    />
    <view class="action-row">
      <button
        class="hint-btn"
        bindtap="showHintTap"
        wx:if="{{!showHint && currentQuestion && currentQuestion.hint}}">
        💡 提示
      </button>
      <button
        class="submit-btn {{!userAnswer || waitingForNext ? 'submit-disabled' : ''}}"
        bindtap="handleSubmit"
        disabled="{{!userAnswer || waitingForNext}}">
        提交答案
      </button>
    </view>
  </view>

</scroll-view>

<!-- 答案反馈弹层 -->
<view class="feedback-sheet {{feedbackType}}" wx:if="{{showFeedback}}">
  <view class="feedback-handle"></view>
  <view class="feedback-body">
    <view class="feedback-icon-wrap {{isCorrect ? 'icon-correct' : 'icon-wrong'}}">
      <image wx:if="{{isCorrect}}" class="feedback-duck" src="/images/duck-avatar.png" mode="aspectFit"></image>
      <text wx:else class="feedback-emoji">💥</text>
    </view>
    <view class="feedback-info">
      <text class="feedback-title {{isCorrect ? 'title-correct' : 'title-wrong'}}">
        {{isCorrect ? '答对了！真棒 🎉' : '这次没对～'}}
      </text>
      <text class="feedback-answer" wx:if="{{!isCorrect}}">正确答案：{{currentQuestion.answer}}</text>
      <view class="feedback-solution" wx:if="{{currentQuestion && currentQuestion.solutionBlocks}}">
        <math-text blocks="{{currentQuestion.solutionBlocks}}" />
      </view>
    </view>
  </view>
  <button class="next-btn" bindtap="handleNext">
    {{currentIndex + 1 >= totalQuestions ? '查看结果 🏆' : '下一题 →'}}
  </button>
</view>

<!-- 鸭子动画 -->
<duck-animation id="duckAnim" bind:done="onDuckAnimDone"></duck-animation>
```

- [ ] **Step 3: Update practice.wxss — add geometry container styles**

Append to `packagePractice/pages/practice/practice.wxss`:

```css
/* Question body — override for rich content */
.question-body {
  display: block;
  min-height: 80rpx;
  padding: 16rpx 0;
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.8;
}

/* Feedback solution with math-text */
.feedback-solution {
  font-size: 26rpx;
  color: var(--text-sub);
  line-height: 1.6;
  margin-top: 8rpx;
}

/* Answer section tweaks for math-input */
.answer-section .action-row {
  margin-top: 24rpx;
}
```

Also remove the old `.question-text` style (60rpx font-weight 800 centered) since we no longer use it, and update `.question-body` to remove `display: flex; align-items: center; justify-content: center`.

- [ ] **Step 4: Rewrite formatSingleQuestion in practice.js**

In `packagePractice/pages/practice/practice.js`, replace the `formatSingleQuestion` method:

```javascript
  formatSingleQuestion: function (q) {
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
      solutionBlocks: q.solutionBlocks || null,
      _bankId: q._bankId || null
    };
  },
```

- [ ] **Step 5: Rewrite checkAnswer to support fractions**

Replace the `checkAnswer` method:

```javascript
  checkAnswer: function (userAnswer, correctAnswer, answerFormat) {
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
  },

  parseFraction: function (str) {
    if (str.includes('/')) {
      const parts = str.split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
    const val = parseFloat(str);
    return isNaN(val) ? null : val;
  },
```

- [ ] **Step 6: Update handleSubmit and onAnswerInput**

Replace `handleAnswerInput` with `onAnswerInput` that receives the math-input event:

```javascript
  onAnswerInput: function (e) {
    this.setData({
      userAnswer: e.detail.value
    });
  },
```

Update `handleSubmit` to pass `answerFormat`:

```javascript
  // Inside handleSubmit, change:
  const isCorrect = this.checkAnswer(userAnswer, currentQuestion.answer, currentQuestion.answerFormat);
```

Update `answerRecord` to store rich fields:

```javascript
    const answerRecord = {
      questionId: currentQuestion.id,
      contentBlocks: currentQuestion.contentBlocks,
      correctAnswer: currentQuestion.answer,
      userAnswer,
      isCorrect,
      time: new Date()
    };
```

- [ ] **Step 7: Update addToWrongQuestions to store rich fields**

```javascript
  addToWrongQuestions: function (question, wrongAnswer) {
    const db = wx.cloud.database();

    db.collection('wrong_questions')
      .where({
        _openid: '{openid}',
        questionId: question.id
      })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          db.collection('wrong_questions')
            .doc(res.data[0]._id)
            .update({
              data: {
                wrongCount: db.command.inc(1),
                lastWrongAnswer: wrongAnswer,
                lastWrongTime: db.serverDate()
              }
            });
        } else {
          db.collection('wrong_questions').add({
            data: {
              questionId: question.id,
              contentBlocks: question.contentBlocks,
              diagram: question.diagram,
              answer: question.answer,
              answerFormat: question.answerFormat,
              answerUnit: question.answerUnit,
              solutionBlocks: question.solutionBlocks,
              type: question.type,
              wrongAnswer,
              wrongCount: 1,
              mastered: false,
              createTime: db.serverDate(),
              lastWrongTime: db.serverDate()
            }
          });
        }
      })
      .catch(err => {
        console.error('添加错题失败：', err);
      });
  },
```

- [ ] **Step 8: Remove processQuestions and clean up old refs**

Delete the `processQuestions` method. Update `loadQuestions` and `loadWrongQuestions` to use `formatSingleQuestion` instead (they'll need data mapping since DB fields now use the new format).

- [ ] **Step 9: Reset math-input on next question**

In `handleNext`, after resetting state, call:

```javascript
  const mathInput = this.selectComponent('#mathInput');
  if (mathInput) mathInput.reset();
```

- [ ] **Step 10: Commit**

```bash
git add packagePractice/pages/practice/
git commit -m "feat: integrate math-text, geometry-canvas, math-input into practice page"
```

---

## Task 6: Rewrite `generateQuestions` cloud function prompt

**Files:**
- Modify: `cloudfunctions/generateQuestions/index.js`

- [ ] **Step 1: Rewrite SYSTEM_PROMPT and buildUserPrompt**

Replace the `SYSTEM_PROMPT` and `buildUserPrompt` in `cloudfunctions/generateQuestions/index.js`:

```javascript
const SYSTEM_PROMPT = `你是小学数学出题专家。你要生成结构化JSON格式的题目，支持LaTeX公式和几何图形。

规则：
1. 答案必须正确
2. 只输出纯JSON，不加其他内容
3. contentBlocks中，数学表达式用latex类型（如分数用 \\frac{1}{2}），普通文字用text类型
4. solutionBlocks同理，解题步骤中的公式用latex类型
5. 几何题必须提供diagram字段
6. answerFormat：纯数字用number，分数答案用fraction，文字答案用text

LaTeX常用语法：
- 分数：\\frac{分子}{分母}
- 乘号：\\times
- 除号：\\div
- 角度：\\angle
- 平方：x^2
- 根号：\\sqrt{x}
- 文字单位：\\text{cm}`;

const buildUserPrompt = (params) => {
  const { knowledgeName, grade, count, difficulty, questionType, existingSummaries, prefetchHint } = params;
  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const typeMap = { calculation: '计算题', fillBlank: '填空题', application: '应用题', geometry: '几何题' };

  let text = `生成${count}道${grade}${knowledgeName}${typeMap[questionType] || '计算题'}，难度${diffMap[difficulty] || '中等'}。

输出JSON格式：
{"questions":[{
  "id": 1,
  "type": "${typeMap[questionType] || '计算题'}",
  "contentBlocks": [{"type":"text","value":"题目文字"},{"type":"latex","value":"\\\\frac{1}{2}"}],
  "diagram": null,
  "answer": "答案",
  "answerFormat": "number",
  "answerUnit": "",
  "solutionBlocks": [{"type":"text","value":"解题步骤"},{"type":"latex","value":"公式"}],
  "tip": "易错提示"
}]}`;

  if (questionType === 'geometry') {
    text += `

几何题的diagram格式：
{"type":"geometry","width":250,"height":200,"shapes":[...],"labels":[...],"annotations":[...]}

2D shapes: polygon(points数组), circle(center,radius), line(from,to), dashed(from,to)
3D shapes: cuboid(origin,length,width,height), cube(origin,size), cylinder(origin,radius,height), cone(origin,radius,height)
3D shape可选: hiddenEdges(默认true), faceFills([{face:"front",fill:"rgba(...)"}])
annotations: rightAngle(vertex,dir1,dir2,size), shade(points,fill), dimensionLine(from,to,text,offset)
labels: {text,position:[x,y],fontSize}

坐标规则：
- 所有坐标在[0,width]x[0,height]范围内
- 3D图形origin的x建议40-80，y建议height-30到height-50
- labels之间间隔至少20px

长方体模板（可直接使用，调整数值）：
{"type":"cuboid","origin":[60,160],"length":100,"width":60,"height":80,"stroke":"#333","fill":"transparent","hiddenEdges":true}`;
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

- [ ] **Step 2: Rewrite parseResponse with validation**

```javascript
const VALID_BLOCK_TYPES = ['text', 'latex'];
const VALID_SHAPE_TYPES = ['polygon', 'circle', 'line', 'arc', 'dashed', 'cuboid', 'cube', 'cylinder', 'cone', 'sphere'];

const validateContentBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  return blocks.every(b => VALID_BLOCK_TYPES.includes(b.type) && typeof b.value === 'string' && b.value.length > 0);
};

const validateDiagram = (d) => {
  if (!d) return true;
  if (!d.width || !d.height || !Array.isArray(d.shapes)) return false;
  return d.shapes.every(s => VALID_SHAPE_TYPES.includes(s.type));
};

const validateLatexBrackets = (str) => {
  let depth = 0;
  for (const ch of str) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
};

const validateQuestion = (q) => {
  if (!validateContentBlocks(q.contentBlocks)) return false;
  if (!validateDiagram(q.diagram)) return false;
  const allLatex = (q.contentBlocks || [])
    .concat(q.solutionBlocks || [])
    .filter(b => b.type === 'latex');
  return allLatex.every(b => validateLatexBrackets(b.value));
};

const parseResponse = (content) => {
  if (!content) throw new Error('API响应为空');
  console.log('[原始响应]', content.slice(0, 300));

  let jsonStr = content.trim().replace(/```json?|```/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('未找到JSON内容');

  const parsed = JSON.parse(match[0]);
  if (!parsed.questions?.length) throw new Error('题目列表为空');

  return parsed.questions
    .map((q, i) => ({
      id: i + 1,
      type: q.type || '计算题',
      contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.content || '').trim() }],
      diagram: q.diagram || null,
      answer: String(q.answer || '').trim(),
      answerFormat: q.answerFormat || 'number',
      answerUnit: q.answerUnit || '',
      solutionBlocks: q.solutionBlocks || [{ type: 'text', value: String(q.solution || '').trim() }],
      tip: String(q.tip || '').trim()
    }))
    .filter(q => {
      const valid = validateQuestion(q);
      if (!valid) console.warn('[parseResponse] 题目校验失败，丢弃:', q.id);
      return valid;
    });
};
```

- [ ] **Step 3: Update maxTokens for richer output**

Change the maxTokens calculation:

```javascript
    const maxTokens = count === 1 ? 800 : 2000;
```

- [ ] **Step 4: Commit**

```bash
cd cloudfunctions/generateQuestions && git add -A && cd ../..
git commit -m "feat: rewrite generateQuestions prompt for structured rich content output"
```

---

## Task 7: Update `getQuestions` cloud function

**Files:**
- Modify: `cloudfunctions/getQuestions/index.js`

- [ ] **Step 1: Update formatBankQuestion to pass through rich fields**

```javascript
function formatBankQuestion(q, index) {
  return {
    id: index + 1,
    type: TYPE_MAP[q.questionType] || q.questionType || '计算题',
    contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.content || '').trim() }],
    diagram: q.diagram || null,
    answer: String(q.answer || '').trim(),
    answerFormat: q.answerFormat || 'number',
    answerUnit: q.answerUnit || '',
    solutionBlocks: q.solutionBlocks || [{ type: 'text', value: String(q.solution || '').trim() }],
    tip: String(q.tip || '').trim(),
    _bankId: q._id
  };
}
```

- [ ] **Step 2: Update backfillAiQuestions to store rich fields**

```javascript
function backfillAiQuestions(knowledgeId, knowledgeName, grade, difficulty, questionType, questions) {
  const db = cloud.database();
  const now = new Date();

  const tasks = questions.map(q =>
    db.collection('question_bank').add({
      data: {
        knowledgeId,
        knowledgeName,
        grade: grade || '五年级',
        semester: '',
        unit: 0,
        questionType: questionType || 'calculation',
        difficulty: difficulty || 'medium',
        contentBlocks: q.contentBlocks,
        diagram: q.diagram || null,
        answer: q.answer,
        answerFormat: q.answerFormat || 'number',
        answerUnit: q.answerUnit || '',
        solutionBlocks: q.solutionBlocks,
        tip: q.tip || '',
        source: 'ai_realtime',
        verified: false,
        createdAt: now,
        updatedAt: now
      }
    }).catch(e => console.error('[backfill] error:', e.message))
  );

  Promise.all(tasks).catch(() => {});
}
```

- [ ] **Step 3: Commit**

```bash
cd cloudfunctions/getQuestions && git add -A && cd ../..
git commit -m "feat: update getQuestions to pass through rich content fields"
```

---

## Task 8: Update navigation paths for subpackage

**Files:**
- Modify: `pages/practice-select/practice-select.js` (navigation URL)
- Modify: any other files that navigate to `/pages/practice/practice`

- [ ] **Step 1: Find all references to the old practice path**

Search for `/pages/practice/practice` in all JS files and update to `/packagePractice/pages/practice/practice`.

In `pages/practice-select/practice-select.js`, find the `wx.navigateTo` call and update the URL:

```javascript
wx.navigateTo({
  url: '/packagePractice/pages/practice/practice?type=' + type + '&source=generated'
});
```

- [ ] **Step 2: Update any other navigation references**

Check `pages/index/index.js` and other files that might reference the practice page path and update them.

- [ ] **Step 3: Verify navigation works**

In WeChat DevTools:
- Go to practice-select
- Select a knowledge point and generate questions
- Verify it navigates to the practice page in the subpackage

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: update practice page navigation URLs for subpackage"
```

---

## Task 9: Update deduplication logic in generateQuestions

**Files:**
- Modify: `cloudfunctions/generateQuestions/index.js`

- [ ] **Step 1: Update isDuplicate to use contentBlocks**

The old `isDuplicate` compares `question.content` strings. Since we now use `contentBlocks`, extract text values for dedup:

```javascript
const extractTextFromBlocks = (blocks) => {
  if (!blocks || !Array.isArray(blocks)) return '';
  return blocks.map(b => b.value || '').join('');
};

const normContent = (s) => String(s || '').replace(/\s/g, '');

const isDuplicate = (question, existingList) => {
  if (!question || !existingList || !existingList.length) return false;
  const n = normContent(extractTextFromBlocks(question.contentBlocks));
  return existingList.some((ex) => normContent(ex) === n);
};
```

- [ ] **Step 2: Commit**

```bash
cd cloudfunctions/generateQuestions && git add -A && cd ../..
git commit -m "fix: update deduplication to work with contentBlocks"
```

---

## Task 10: Clear old database collections

- [ ] **Step 1: Clear collections via Cloud Console**

In WeChat Cloud Console (云开发控制台), go to Database and clear these collections:
- `question_bank` — delete all documents
- `wrong_questions` — delete all documents
- `user_question_log` — delete all documents
- `practice_records` — delete all documents

This is a manual operation in the web console, not code.

- [ ] **Step 2: Verify collections are empty**

In Cloud Console, confirm each collection shows 0 documents.

---

## Task 11: End-to-end testing and polish

- [ ] **Step 1: Test calculation question (LaTeX formulas)**

Generate a calculation question and verify:
- contentBlocks render with inline LaTeX (fractions, etc.)
- answer input works in number mode
- solution shows LaTeX formulas in feedback

- [ ] **Step 2: Test geometry question (2D)**

Generate a geometry question and verify:
- Canvas renders the shape (triangle/rectangle)
- Labels and annotations display correctly
- Right angle marks show up

- [ ] **Step 3: Test geometry question (3D)**

Generate a 3D geometry question (长方体/正方体) and verify:
- Cuboid renders with visible and hidden edges
- Face fills work
- Labels are positioned correctly

- [ ] **Step 4: Test fraction answer input**

Generate a question with `answerFormat: 'fraction'` and verify:
- Fraction input panel appears (numerator/denominator)
- Submitting "3/4" matches answer "6/8" (equivalent fractions)

- [ ] **Step 5: Test wrong question storage**

Answer a question incorrectly and verify:
- Wrong question is stored with `contentBlocks`, `diagram`, `solutionBlocks`
- Wrong question list can render rich content

- [ ] **Step 6: Test progressive generation**

Select a large question count and verify:
- Progressive generation still works with new data format
- Questions appear as they're generated

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "test: verify end-to-end rich content quiz system"
```
