const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasSize: 200
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d || d.hour == null) return;

      const size = Math.min(getContainerWidth(), 220);
      this.setData({ canvasSize: size });

      setTimeout(() => {
        initCanvas(this, 'clockCanvas', size, size, (ctx) => {
          this._draw(ctx, d, size);
        });
      }, 20);
    },

    _draw(ctx, d, size) {
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 8;

      // Clock face
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFDF5';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Minute ticks
      for (let i = 0; i < 60; i++) {
        const angle = (i * 6 - 90) * Math.PI / 180;
        const isMajor = i % 5 === 0;
        const outerR = r - 2;
        const innerR = isMajor ? r - r * 0.12 : r - r * 0.06;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = isMajor ? 2 : 0.8;
        ctx.stroke();
      }

      // Hour numbers
      const numFontSize = Math.max(Math.round(r * 0.16), 10);
      ctx.font = 'bold ' + numFontSize + 'px sans-serif';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let h = 1; h <= 12; h++) {
        const angle = (h * 30 - 90) * Math.PI / 180;
        const numR = r - r * 0.22;
        ctx.fillText(String(h), cx + Math.cos(angle) * numR, cy + Math.sin(angle) * numR);
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();

      const hour = d.hour;
      const minute = d.minute || 0;

      // Hour hand
      const hourAngle = ((hour % 12) * 30 + minute * 0.5 - 90) * Math.PI / 180;
      const hourLen = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hourAngle) * hourLen, cy + Math.sin(hourAngle) * hourLen);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Minute hand
      const minuteAngle = (minute * 6 - 90) * Math.PI / 180;
      const minuteLen = r * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(minuteAngle) * minuteLen, cy + Math.sin(minuteAngle) * minuteLen);
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }
  }
});
