const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

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
      const containerW = getContainerWidth();
      const gap = 6;
      const itemSize = Math.min(Math.floor((containerW - (cols - 1) * gap) / cols), 36);
      const totalWidth = cols * itemSize + (cols - 1) * gap;
      const totalHeight = rows * itemSize + (rows - 1) * gap;
      this.setData({ canvasWidth: totalWidth, canvasHeight: totalHeight });

      setTimeout(() => {
        initCanvas(this, 'countingCanvas', totalWidth, totalHeight, (ctx) => {
          this._draw(ctx, d, rows, cols, itemSize, gap);
        });
      }, 20);
    },

    _draw(ctx, d, rows, cols, itemSize, gap) {
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
