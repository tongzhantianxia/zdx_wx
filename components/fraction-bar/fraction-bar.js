const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 280,
    canvasHeight: 60
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.denominator || d.denominator <= 0) return;

      const width = getContainerWidth();
      const height = 60;
      this.setData({ canvasWidth: width, canvasHeight: height });

      setTimeout(() => {
        initCanvas(this, 'fractionBarCanvas', width, height, (ctx) => {
          this._draw(ctx, d, width, height);
        });
      }, 20);
    },

    _draw(ctx, d, width, height) {
      const numerator = Math.max(d.numerator || 0, 0);
      const denominator = d.denominator;
      const color = d.color || '#4A90E2';

      const barHeight = 34;
      const barY = 4;
      const unitWidth = width / denominator;

      for (let i = 0; i < denominator; i++) {
        const x = i * unitWidth;
        if (i < numerator) {
          ctx.fillStyle = color;
          ctx.fillRect(x + 1, barY, unitWidth - 2, barHeight);
        } else {
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, barY, unitWidth - 2, barHeight);
        }
      }

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(numerator + '/' + denominator, width / 2, barY + barHeight + 6);

      ctx.restore();
    }
  }
});
