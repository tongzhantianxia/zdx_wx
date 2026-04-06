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
