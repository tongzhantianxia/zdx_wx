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
