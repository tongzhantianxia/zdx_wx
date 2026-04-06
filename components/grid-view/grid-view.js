const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 280,
    canvasHeight: 280
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
      const size = Math.min(rawW, 280);
      this.setData({ canvasWidth: size, canvasHeight: size });

      setTimeout(() => {
        initCanvas(this, 'gridCanvas', size, size, (ctx) => {
          this._draw(ctx, d, size, size);
        });
      }, 20);
    },

    _draw(ctx, d, W, H) {
      const cols = d.gridSize[0] || 5;
      const rows = d.gridSize[1] || 5;
      const showAxes = d.showAxes !== false;

      // Padding to allow axis labels
      const pad = { top: 20, right: 20, bottom: 36, left: 36 };
      const chartW = W - pad.left - pad.right;
      const chartH = H - pad.top - pad.bottom;
      const cellW = chartW / cols;
      const cellH = chartH / rows;

      // Draw grid lines
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([]);

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

      // Draw axes
      if (showAxes) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // X-axis (bottom of grid = row 0 baseline at pad.top + chartH)
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top + chartH);
        ctx.lineTo(pad.left + chartW + 8, pad.top + chartH);
        ctx.stroke();

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top - 8);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.stroke();

        // Arrowheads
        ctx.fillStyle = '#333';
        // X arrow
        ctx.beginPath();
        ctx.moveTo(pad.left + chartW + 8, pad.top + chartH);
        ctx.lineTo(pad.left + chartW + 2, pad.top + chartH - 4);
        ctx.lineTo(pad.left + chartW + 2, pad.top + chartH + 4);
        ctx.fill();
        // Y arrow
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top - 8);
        ctx.lineTo(pad.left - 4, pad.top - 2);
        ctx.lineTo(pad.left + 4, pad.top - 2);
        ctx.fill();

        // Axis tick labels along X
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let c = 0; c <= cols; c++) {
          const x = pad.left + c * cellW;
          ctx.fillText(String(c), x, pad.top + chartH + 5);
        }

        // Axis tick labels along Y
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let r = 0; r <= rows; r++) {
          const y = pad.top + chartH - r * cellH;
          if (r === 0) continue; // 0 already on x-axis
          ctx.fillText(String(r), pad.left - 5, y);
        }

        // Origin label
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('0', pad.left - 4, pad.top + chartH + 4);
      }

      // Draw points
      const points = d.points || [];
      points.forEach(pt => {
        const [px, py] = pt.coordinate;
        const cx = pad.left + px * cellW;
        const cy = pad.top + chartH - py * cellH;

        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#4A90E2';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (pt.label) {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(pt.label, cx, cy - 7);
        }
      });

      // Scale text
      if (d.scale) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('比例 ' + d.scale.ratio + ' ' + d.scale.unit, W - 4, H - 4);
      }

      ctx.restore();
    }
  }
});
