const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 240
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.gridSize) return;

      const rawW = getContainerWidth();
      const W = rawW;
      const H = Math.round(rawW * 0.8);
      this.setData({ canvasWidth: W, canvasHeight: H });

      setTimeout(() => {
        initCanvas(this, 'transformCanvas', W, H, (ctx) => {
          this._draw(ctx, d, W, H);
        });
      }, 20);
    },

    _drawPolygon(ctx, pts, fillColor, strokeColor, dashed) {
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      if (dashed) {
        ctx.setLineDash([5, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    },

    _draw(ctx, d, W, H) {
      const cols = d.gridSize[0] || 8;
      const rows = d.gridSize[1] || 6;

      const pad = { top: 16, right: 16, bottom: 28, left: 36 };
      const chartW = W - pad.left - pad.right;
      const chartH = H - pad.top - pad.bottom;
      const cellW = chartW / cols;
      const cellH = chartH / rows;

      // Grid
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 0.8;
      for (let c = 0; c <= cols; c++) {
        const x = pad.left + c * cellW;
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + chartH);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const y = pad.top + r * cellH;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + chartW, y);
        ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1.5;
      // X-axis at bottom
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top + chartH);
      ctx.lineTo(pad.left + chartW, pad.top + chartH);
      ctx.stroke();
      // Y-axis at left
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top);
      ctx.lineTo(pad.left, pad.top + chartH);
      ctx.stroke();

      // Axis tick numbers
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let c = 0; c <= cols; c++) {
        ctx.fillText(String(c), pad.left + c * cellW, pad.top + chartH + 3);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let r = 1; r <= rows; r++) {
        ctx.fillText(String(rows - r), pad.left - 4, pad.top + r * cellH);
      }

      // Helper to convert grid coord to canvas coord
      const toCanvas = (gx, gy) => [
        pad.left + gx * cellW,
        pad.top + chartH - gy * cellH
      ];

      // Draw axis of symmetry if present
      if (d.axis) {
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        if (d.axis.type === 'x') {
          const y = pad.top + chartH;
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(pad.left + chartW, y);
          ctx.stroke();
        } else if (d.axis.type === 'y') {
          ctx.beginPath();
          ctx.moveTo(pad.left, pad.top);
          ctx.lineTo(pad.left, pad.top + chartH);
          ctx.stroke();
        } else if (d.axis.type === 'custom' && d.axis.points && d.axis.points.length === 2) {
          const [ax1, ay1] = toCanvas(d.axis.points[0][0], d.axis.points[0][1]);
          const [ax2, ay2] = toCanvas(d.axis.points[1][0], d.axis.points[1][1]);
          ctx.beginPath();
          ctx.moveTo(ax1, ay1);
          ctx.lineTo(ax2, ay2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Convert shape points to canvas coords
      const origPts = (d.original && d.original.points || []).map(p => toCanvas(p[0], p[1]));
      const transPts = (d.transformed && d.transformed.points || []).map(p => toCanvas(p[0], p[1]));

      // Original shape (blue dashed)
      const origStroke = (d.original && d.original.stroke) || '#4A90E2';
      this._drawPolygon(ctx, origPts, 'rgba(74,144,226,0.15)', origStroke, true);

      // Transformed shape (orange solid)
      const transStroke = (d.transformed && d.transformed.stroke) || '#ED7D31';
      this._drawPolygon(ctx, transPts, 'rgba(237,125,49,0.15)', transStroke, false);

      // Labels
      if (origPts.length > 0) {
        const ox = origPts.reduce((s, p) => s + p[0], 0) / origPts.length;
        const oy = origPts.reduce((s, p) => s + p[1], 0) / origPts.length;
        ctx.font = '11px sans-serif';
        ctx.fillStyle = origStroke;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('原图', ox, oy);
      }

      if (transPts.length > 0) {
        const tx = transPts.reduce((s, p) => s + p[0], 0) / transPts.length;
        const ty = transPts.reduce((s, p) => s + p[1], 0) / transPts.length;
        ctx.font = '11px sans-serif';
        ctx.fillStyle = transStroke;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('变换后', tx, ty);
      }

      ctx.restore();
    }
  }
});
