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
      if (range <= 0) return;
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
