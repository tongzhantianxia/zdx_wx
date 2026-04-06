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
