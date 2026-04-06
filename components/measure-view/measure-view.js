const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 80
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || d.value == null) return;

      const W = getContainerWidth();
      const H = 80;
      this.setData({ canvasWidth: W, canvasHeight: H });

      setTimeout(() => {
        initCanvas(this, 'measureCanvas', W, H, (ctx) => {
          this._draw(ctx, d, W, H);
        });
      }, 20);
    },

    _draw(ctx, d, W, H) {
      const value = d.value || 0;
      const unit = d.unit || 'cm';
      const showMarkings = d.showMarkings !== false;

      // Ruler geometry
      const padL = 16;
      const padR = 32; // room for unit label
      const rulerTop = 38;
      const rulerH = 28;
      const rulerW = W - padL - padR;

      const totalUnits = Math.ceil(value) + 1;
      const unitPx = rulerW / totalUnits;

      // Ruler background (light gray body)
      ctx.fillStyle = '#f5f5f5';
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(padL, rulerTop, rulerW, rulerH);
      ctx.fill();
      ctx.stroke();

      // Highlighted fill (0 to value)
      const highlightW = (value / totalUnits) * rulerW;
      ctx.fillStyle = 'rgba(74,144,226,0.25)';
      ctx.fillRect(padL, rulerTop, highlightW, rulerH);

      // Top edge (thicker line)
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(padL, rulerTop);
      ctx.lineTo(padL + rulerW, rulerTop);
      ctx.stroke();

      // Tick marks and labels
      if (showMarkings) {
        for (let i = 0; i <= totalUnits; i++) {
          const tx = padL + i * unitPx;

          // Major tick (whole unit)
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tx, rulerTop);
          ctx.lineTo(tx, rulerTop + 14);
          ctx.stroke();

          // Number label
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#444';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(String(i), tx, rulerTop + 15);

          // Half-unit minor tick
          if (i < totalUnits) {
            const halfX = tx + unitPx / 2;
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(halfX, rulerTop);
            ctx.lineTo(halfX, rulerTop + 8);
            ctx.stroke();
          }
        }
      }

      // Value label above highlighted portion
      if (value > 0) {
        const labelX = padL + highlightW / 2;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#4A90E2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(value + ' ' + unit, labelX, rulerTop - 4);
      }

      // Unit label at right end
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit, padL + rulerW + 5, rulerTop + rulerH / 2);

      ctx.restore();
    }
  }
});
