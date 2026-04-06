const { initCanvas, getContainerWidth, CHART_COLORS } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 280,
    canvasHeight: 210
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || !d.items || !d.items.length) return;

      const rawW = getContainerWidth();
      const W = Math.min(rawW, 280);
      const H = Math.round(W * 0.75);
      this.setData({ canvasWidth: W, canvasHeight: H });

      setTimeout(() => {
        initCanvas(this, 'probabilityCanvas', W, H, (ctx) => {
          this._draw(ctx, d, W, H);
        });
      }, 20);
    },

    /**
     * Format a probability as a fraction string if it's a simple fraction,
     * otherwise as a percentage.
     */
    _formatProb(p) {
      // Try common fractions
      const fracs = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],
                     [1,6],[5,6],[1,8],[3,8],[5,8],[7,8]];
      for (const [n, denom] of fracs) {
        if (Math.abs(p - n / denom) < 0.001) return n + '/' + denom;
      }
      return Math.round(p * 100) + '%';
    },

    _draw(ctx, d, W, H) {
      const isSpinner = d.type === 'spinner';
      const items = d.items || [];

      // Normalize probabilities
      const total = items.reduce((s, it) => s + (it.probability || 0), 0);
      const probs = items.map(it => (it.probability || 0) / (total || 1));

      // Spinner has pointer at top, so shift center down slightly
      const pointerH = isSpinner ? 18 : 0;
      const radius = Math.min(W, H - pointerH) / 2 - 12;
      const cx = W / 2;
      const cy = (H + pointerH) / 2;

      // Draw sectors
      let startAngle = -Math.PI / 2; // Start at top
      probs.forEach((prob, i) => {
        const angle = prob * Math.PI * 2;
        const endAngle = startAngle + angle;
        const midAngle = startAngle + angle / 2;

        // Sector fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
        ctx.fill();

        // Sector border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label inside sector
        const labelR = radius * 0.65;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelText = items[i].label || '';
        const probText = this._formatProb(prob);

        // Only draw if sector is large enough
        if (angle > 0.25) {
          ctx.fillText(labelText, lx, ly - 6);
          ctx.font = '10px sans-serif';
          ctx.fillText(probText, lx, ly + 7);
        }

        startAngle = endAngle;
      });

      // Outer circle border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spinner pointer
      if (isSpinner) {
        const pTip = cy - radius - 2;
        const pBase = pTip - pointerH + 4;

        ctx.beginPath();
        ctx.moveTo(cx, pTip);
        ctx.lineTo(cx - 7, pBase);
        ctx.lineTo(cx + 7, pBase);
        ctx.closePath();
        ctx.fillStyle = '#E74C3C';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Center pin
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }
  }
});
