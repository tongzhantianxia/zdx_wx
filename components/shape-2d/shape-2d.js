const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

// ===== Helper functions (from geometry-canvas) =====
function norm(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function perpendicular(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return norm([-dy, dx]);
}

// ===== High-level shape → low-level shapes converter =====
function shapeToShapes(data) {
  const s = data.shape;
  const dim = data.dimensions || {};
  const shapes = [];
  const labels = data.labels ? data.labels.slice() : [];
  // Padding around shape for labels
  const pad = { top: 20, bottom: 28, left: 30, right: 20 };

  switch (s) {
    case 'rectangle': {
      const l = dim.length || 80;
      const w = dim.width || 50;
      const sc = Math.min(160 / l, 120 / w);
      const sl = l * sc, sw = w * sc;
      const W = sl + pad.left + pad.right;
      const H = sw + pad.top + pad.bottom;
      const x0 = pad.left, y0 = pad.top;
      shapes.push({ type: 'polygon', points: [[x0, y0], [x0 + sl, y0], [x0 + sl, y0 + sw], [x0, y0 + sw]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: l + 'cm', position: [x0 + sl / 2, y0 + sw + 14], fontSize: 12 });
        labels.push({ text: w + 'cm', position: [x0 - 16, y0 + sw / 2], fontSize: 12 });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    case 'square': {
      const side = dim.side || 60;
      const sc = 120 / side;
      const ss = side * sc;
      const W = ss + pad.left + pad.right;
      const H = ss + pad.top + pad.bottom;
      const x0 = pad.left, y0 = pad.top;
      shapes.push({ type: 'polygon', points: [[x0, y0], [x0 + ss, y0], [x0 + ss, y0 + ss], [x0, y0 + ss]], stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: side + 'cm', position: [x0 + ss / 2, y0 + ss + 14], fontSize: 12 });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    case 'circle': {
      const r = dim.radius || 50;
      const sc = Math.min(80 / r, 80);
      const sr = Math.max(r * sc, 40);
      const W = sr * 2 + pad.left + pad.right + 20;
      const H = sr * 2 + pad.top + pad.bottom;
      const cx = pad.left + sr + 10, cy = pad.top + sr;
      shapes.push({ type: 'circle', center: [cx, cy], radius: sr, stroke: '#333' });
      shapes.push({ type: 'line', from: [cx, cy], to: [cx + sr, cy], stroke: '#4A90E2' });
      if (!labels.length) {
        labels.push({ text: 'r=' + r, position: [cx + sr / 2, cy - 10], fontSize: 11, color: '#4A90E2' });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    case 'triangle': {
      const base = dim.base || 80;
      const height = dim.height || 60;
      const sc = Math.min(160 / base, 120 / height);
      const sb = base * sc, sh = height * sc;
      const W = sb + pad.left + pad.right;
      const H = sh + pad.top + pad.bottom;
      const x0 = pad.left, y0 = pad.top + sh;
      const apex = [x0 + sb / 2, pad.top];
      shapes.push({ type: 'polygon', points: [[x0, y0], [x0 + sb, y0], apex], stroke: '#333' });
      shapes.push({ type: 'dashed', from: apex, to: [apex[0], y0], stroke: '#999' });
      if (!labels.length) {
        labels.push({ text: base + 'cm', position: [x0 + sb / 2, y0 + 14], fontSize: 12 });
        labels.push({ text: 'h=' + height, position: [apex[0] + 16, pad.top + sh / 2], fontSize: 11, color: '#999' });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    case 'parallelogram': {
      const base = dim.base || 80;
      const height = dim.height || 50;
      const offset = Math.round(height * 0.4);
      const sc = Math.min(160 / (base + offset), 120 / height);
      const sb = base * sc, sh = height * sc, so = offset * sc;
      const W = sb + so + pad.left + pad.right;
      const H = sh + pad.top + pad.bottom;
      const x0 = pad.left, y0 = pad.top + sh;
      // Points: top-left, top-right, bottom-right, bottom-left
      const tl = [x0 + so, pad.top], tr = [x0 + so + sb, pad.top];
      const br = [x0 + sb, y0], bl = [x0, y0];
      shapes.push({ type: 'polygon', points: [tl, tr, br, bl], stroke: '#333' });
      // Height dashed line (from top-left vertex straight down)
      const footX = tl[0];
      shapes.push({ type: 'dashed', from: tl, to: [footX, y0], stroke: '#999' });
      if (!labels.length) {
        labels.push({ text: base + 'cm', position: [x0 + (sb + so) / 2, y0 + 14], fontSize: 12 });
        labels.push({ text: 'h=' + height, position: [footX - 20, pad.top + sh / 2], fontSize: 11, color: '#999' });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    case 'trapezoid': {
      const top = dim.top || 40;
      const base = dim.base || 80;
      const height = dim.height || 50;
      const sc = Math.min(160 / base, 120 / height);
      const sb = base * sc, st = top * sc, sh = height * sc;
      const W = sb + pad.left + pad.right;
      const H = sh + pad.top + pad.bottom;
      const x0 = pad.left, y0 = pad.top + sh;
      const tx0 = x0 + (sb - st) / 2;
      const tl = [tx0, pad.top], tr = [tx0 + st, pad.top];
      const br = [x0 + sb, y0], bl = [x0, y0];
      shapes.push({ type: 'polygon', points: [tl, tr, br, bl], stroke: '#333' });
      // Height dashed line
      shapes.push({ type: 'dashed', from: tl, to: [tl[0], y0], stroke: '#999' });
      if (!labels.length) {
        labels.push({ text: top + 'cm', position: [tx0 + st / 2, pad.top - 14], fontSize: 12 });
        labels.push({ text: base + 'cm', position: [x0 + sb / 2, y0 + 14], fontSize: 12 });
        labels.push({ text: 'h=' + height, position: [tl[0] - 20, pad.top + sh / 2], fontSize: 11, color: '#999' });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    case 'sector': {
      const r = dim.radius || 60;
      const angle = dim.angle || 90;
      const sc = Math.min(80 / r, 80);
      const sr = Math.max(r * sc, 40);
      const W = sr * 2 + pad.left + pad.right;
      const H = sr * 2 + pad.top + pad.bottom;
      const cx = pad.left + sr, cy = pad.top + sr;
      shapes.push({ type: 'line', from: [cx, cy], to: [cx + sr, cy], stroke: '#333' });
      const endRad = -angle * Math.PI / 180;
      shapes.push({ type: 'line', from: [cx, cy], to: [cx + sr * Math.cos(endRad), cy + sr * Math.sin(endRad)], stroke: '#333' });
      shapes.push({ type: 'arc', center: [cx, cy], radius: sr, startAngle: -angle, endAngle: 0, stroke: '#333' });
      if (!labels.length) {
        labels.push({ text: angle + '°', position: [cx + 20, cy - 10], fontSize: 11 });
      }
      return { width: W, height: H, shapes, labels, annotations: [] };
    }
    default:
      break;
  }
  return { width: 250, height: 150, shapes, labels, annotations: [] };
}

Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200
  },

  lifetimes: {
    attached() { if (this.data.data) this._render(); }
  },

  methods: {
    _onDataChange(val) { if (val) this._render(); },

    _render() {
      let d = this.data.data;
      if (!d) return;

      // High-level mode: convert shape+dimensions to low-level format
      if (d.shape && !d.shapes) {
        d = shapeToShapes(d);
      }

      if (!d.shapes || !d.shapes.length) return;

      const containerWidth = getContainerWidth();
      const scale = Math.min(containerWidth / d.width, 2.0);
      const canvasWidth = Math.floor(d.width * scale);
      const canvasHeight = Math.min(Math.floor(d.height * scale), 280);
      this.setData({ canvasWidth, canvasHeight });
      this._diagramData = d;
      this._scale = scale;

      setTimeout(() => {
        initCanvas(this, 'shape2dCanvas', canvasWidth, canvasHeight, (ctx) => {
          ctx.scale(scale, scale);
          this._drawShapes(ctx, d.shapes);
          this._drawAnnotations(ctx, d.annotations || []);
          this._drawLabels(ctx, d.labels || []);
          ctx.restore();
        });
      }, 20);
    },

    // ===== 2D Shape Drawing (ported from geometry-canvas) =====

    _drawShapes(ctx, shapes) {
      for (const s of shapes) {
        switch (s.type) {
          case 'polygon': this._drawPolygon(ctx, s); break;
          case 'circle':  this._drawCircle(ctx, s); break;
          case 'line':    this._drawLine(ctx, s); break;
          case 'arc':     this._drawArc(ctx, s); break;
          case 'dashed':  this._drawDashed(ctx, s); break;
          default: break;
        }
      }
    },

    _drawPolygon(ctx, s) {
      const pts = s.points;
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawCircle(ctx, s) {
      ctx.beginPath();
      ctx.arc(s.center[0], s.center[1], s.radius, 0, Math.PI * 2);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawLine(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s.from[0], s.from[1]);
      ctx.lineTo(s.to[0], s.to[1]);
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawArc(ctx, s) {
      const start = (s.startAngle || 0) * Math.PI / 180;
      const end = (s.endAngle || 360) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(s.center[0], s.center[1], s.radius, start, end);
      if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
      ctx.strokeStyle = s.stroke || '#333';
      ctx.lineWidth = s.lineWidth || 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawDashed(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s.from[0], s.from[1]);
      ctx.lineTo(s.to[0], s.to[1]);
      ctx.strokeStyle = s.stroke || '#999';
      ctx.lineWidth = s.lineWidth || 1;
      ctx.setLineDash(s.dash || [4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    // ===== Annotations (ported from geometry-canvas) =====

    _drawAnnotations(ctx, annotations) {
      for (const a of annotations) {
        switch (a.type) {
          case 'rightAngle':    this._drawRightAngle(ctx, a); break;
          case 'shade':         this._drawShade(ctx, a); break;
          case 'arrow':         this._drawArrow(ctx, a); break;
          case 'parallel':      this._drawParallel(ctx, a); break;
          case 'equal':         this._drawEqual(ctx, a); break;
          case 'dimensionLine': this._drawDimensionLine(ctx, a); break;
          default: break;
        }
      }
    },

    _drawRightAngle(ctx, a) {
      const v = a.vertex;
      const sz = a.size || 8;
      const d1 = norm(a.dir1);
      const d2 = norm(a.dir2);
      const p1 = [v[0] + d1[0] * sz, v[1] + d1[1] * sz];
      const corner = [v[0] + d1[0] * sz + d2[0] * sz, v[1] + d1[1] * sz + d2[1] * sz];
      const p2 = [v[0] + d2[0] * sz, v[1] + d2[1] * sz];
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(corner[0], corner[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = a.stroke || '#333';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawShade(ctx, a) {
      const pts = a.points;
      if (!pts || pts.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = a.fill || 'rgba(100,150,255,0.2)';
      ctx.fill();
    },

    _drawArrow(ctx, a) {
      const from = a.from;
      const to = a.to;
      const stroke = a.stroke || '#333';
      const headLen = a.headLength || 8;
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      ctx.beginPath();
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(to[0] - headLen * Math.cos(angle - Math.PI / 6), to[1] - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to[0] - headLen * Math.cos(angle + Math.PI / 6), to[1] - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = stroke;
      ctx.fill();
    },

    _drawParallel(ctx, a) {
      const mid = midpoint(a.from, a.to);
      const dir = norm([a.to[0] - a.from[0], a.to[1] - a.from[1]]);
      const perp = perpendicular(a.from, a.to);
      const sz = 5;
      const arrowTip = [mid[0] + dir[0] * sz, mid[1] + dir[1] * sz];
      const wing1 = [mid[0] - dir[0] * sz * 0.3 + perp[0] * sz * 0.5, mid[1] - dir[1] * sz * 0.3 + perp[1] * sz * 0.5];
      const wing2 = [mid[0] - dir[0] * sz * 0.3 - perp[0] * sz * 0.5, mid[1] - dir[1] * sz * 0.3 - perp[1] * sz * 0.5];
      ctx.beginPath();
      ctx.moveTo(arrowTip[0], arrowTip[1]);
      ctx.lineTo(wing1[0], wing1[1]);
      ctx.moveTo(arrowTip[0], arrowTip[1]);
      ctx.lineTo(wing2[0], wing2[1]);
      ctx.strokeStyle = a.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();
    },

    _drawEqual(ctx, a) {
      const mid = midpoint(a.from, a.to);
      const perp = perpendicular(a.from, a.to);
      const dir = norm([a.to[0] - a.from[0], a.to[1] - a.from[1]]);
      const count = a.count || 1;
      const tickLen = 4;
      const gap = 3;
      ctx.strokeStyle = a.stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * gap;
        const center = [mid[0] + dir[0] * offset, mid[1] + dir[1] * offset];
        ctx.beginPath();
        ctx.moveTo(center[0] + perp[0] * tickLen, center[1] + perp[1] * tickLen);
        ctx.lineTo(center[0] - perp[0] * tickLen, center[1] - perp[1] * tickLen);
        ctx.stroke();
      }
    },

    _drawDimensionLine(ctx, a) {
      const from = a.from;
      const to = a.to;
      const offset = a.offset || 15;
      const perp = perpendicular(from, to);
      const p1 = [from[0] + perp[0] * offset, from[1] + perp[1] * offset];
      const p2 = [to[0] + perp[0] * offset, to[1] + perp[1] * offset];
      const stroke = a.stroke || '#666';
      // Extension lines
      ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(to[0], to[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
      // Dimension line with arrows
      this._drawArrow(ctx, { from: p1, to: p2, stroke, headLength: 5 });
      this._drawArrow(ctx, { from: p2, to: p1, stroke, headLength: 5 });
      // Text label
      if (a.text) {
        const mid2 = midpoint(p1, p2);
        ctx.save();
        ctx.fillStyle = '#fff';
        const textW = ctx.measureText(a.text).width;
        ctx.fillRect(mid2[0] - textW / 2 - 2, mid2[1] - 6, textW + 4, 12);
        ctx.fillStyle = stroke;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.text, mid2[0], mid2[1]);
        ctx.restore();
      }
    },

    // ===== Labels =====

    _drawLabels(ctx, labels) {
      for (const l of labels) {
        const fontSize = l.fontSize || 12;
        ctx.font = (l.bold ? 'bold ' : '') + fontSize + 'px sans-serif';
        ctx.fillStyle = l.color || '#333';
        ctx.textAlign = l.align || 'center';
        ctx.textBaseline = l.baseline || 'middle';
        ctx.fillText(l.text, l.position[0], l.position[1]);
      }
    }
  }
});
