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
      const height = Math.round(width * 0.7);
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
          ctx.fillText(String(val), x, Math.max(y - 6, 12));
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
