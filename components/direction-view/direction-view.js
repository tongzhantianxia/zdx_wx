const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 260,
    canvasHeight: 260
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      const d = this.data.data;
      if (!d) return;

      const rawW = getContainerWidth();
      const size = Math.min(rawW, 260);
      this.setData({ canvasWidth: size, canvasHeight: size });

      setTimeout(() => {
        initCanvas(this, 'directionCanvas', size, size, (ctx) => {
          this._draw(ctx, d, size, size);
        });
      }, 20);
    },

    /**
     * Parse direction string to angle in radians (0 = North = up, clockwise).
     * Supports: "北","南","东","西","东北","西北","东南","西南",
     * and "北偏东30°","东偏南45°" style compound directions.
     */
    _parseDirection(dirStr) {
      if (!dirStr) return 0;
      const baseAngles = { '北': 0, '东': 90, '南': 180, '西': 270 };

      // Try compound "X偏Y度" pattern
      const match = dirStr.match(/^([北东南西])偏([北东南西])(\d+(?:\.\d+)?)°?$/);
      if (match) {
        const base = baseAngles[match[1]];
        const toward = baseAngles[match[2]];
        const deg = parseFloat(match[3]);
        // Determine sign: rotate base toward target direction
        const diff = ((toward - base) + 360) % 360;
        const sign = diff <= 180 ? 1 : -1;
        return ((base + sign * deg) + 360) % 360;
      }

      // Two-char intercardinal
      const twoChar = { '东北': 45, '东南': 135, '西南': 225, '西北': 315 };
      if (twoChar[dirStr] !== undefined) return twoChar[dirStr];

      // Single cardinal
      if (baseAngles[dirStr] !== undefined) return baseAngles[dirStr];

      return 0;
    },

    _draw(ctx, d, W, H) {
      const cx = W / 2;
      const cy = H / 2;
      const radius = Math.min(W, H) / 2 - 30;

      // Compass cross lines
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);

      ctx.beginPath();
      ctx.moveTo(cx, cy - radius - 5);
      ctx.lineTo(cx, cy + radius + 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - radius - 5, cy);
      ctx.lineTo(cx + radius + 5, cy);
      ctx.stroke();

      ctx.setLineDash([]);

      // Cardinal labels
      const cardLabels = [
        { text: '北', x: cx, y: cy - radius - 18, align: 'center', base: 'bottom' },
        { text: '南', x: cx, y: cy + radius + 18, align: 'center', base: 'top' },
        { text: '东', x: cx + radius + 18, y: cy, align: 'left', base: 'middle' },
        { text: '西', x: cx - radius - 18, y: cy, align: 'right', base: 'middle' }
      ];
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#555';
      cardLabels.forEach(l => {
        ctx.textAlign = l.align;
        ctx.textBaseline = l.base;
        ctx.fillText(l.text, l.x, l.y);
      });

      // Draw reference circle (light)
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center point
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4A90E2';
      ctx.fill();

      // Center label
      if (d.center) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#4A90E2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(d.center, cx, cy - 10);
      }

      // Find max distance for scaling
      const points = d.points || [];
      const maxDist = Math.max(...points.map(p => p.distance || 1), 1);

      points.forEach((pt, i) => {
        const angleDeg = this._parseDirection(pt.direction);
        const angleRad = (angleDeg - 90) * Math.PI / 180; // -90 so 0deg=up
        const r = (pt.distance / maxDist) * radius;
        const px = cx + Math.cos(angleRad) * r;
        const py = cy + Math.sin(angleRad) * r;

        // Line from center to point
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = '#ED7D31';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ED7D31';
        ctx.fill();

        // Label
        if (pt.landmark) {
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#333';
          ctx.textAlign = px < cx ? 'right' : 'left';
          ctx.textBaseline = py < cy ? 'bottom' : 'top';
          const offX = px < cx ? -8 : 8;
          const offY = py < cy ? -4 : 4;
          ctx.fillText(pt.landmark, px + offX, py + offY);
        }
      });

      ctx.restore();
    }
  }
});
