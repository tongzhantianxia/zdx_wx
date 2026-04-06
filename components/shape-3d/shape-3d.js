const { initCanvas, getContainerWidth } = require('../../utils/canvasHelper');

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

function iso(origin, lx, ly, lz) {
  return [
    origin[0] + (lx - ly) * COS30,
    origin[1] - lz + (lx + ly) * SIN30 * 0.5
  ];
}

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

// Convert high-level shape spec to low-level shapes array
function shapeToShapes3d(data) {
  const dim = data.dimensions || {};
  const shape = data.shape;
  const shapes = [];
  const labels = [];
  const pad = { top: 20, bottom: 20, left: 20, right: 20 };

  // Estimate bounding box based on shape type, then set canvas size
  let drawW = 160, drawH = 120;
  switch (shape) {
    case 'cuboid': {
      const l = dim.length || 80, w = dim.width || 50, h = dim.height || 60;
      const sc = Math.min(120 / l, 100 / w, 100 / h);
      const sl = l * sc, sw = w * sc, sh = h * sc;
      drawW = (sl + sw) * COS30 + 20;
      drawH = sh + (sl + sw) * SIN30 * 0.5 + 20;
      const origin = [pad.left + sw * COS30, pad.top + drawH - 10];
      shapes.push({
        type: 'cuboid', origin, length: sl, width: sw, height: sh,
        stroke: '#333', hiddenEdges: data.hiddenEdges !== false, faceFills: data.faceFills || []
      });
      break;
    }
    case 'cube': {
      const s = dim.length || dim.side || 60;
      const sc = Math.min(120 / s, 100 / s);
      const ss = s * sc;
      drawW = ss * 2 * COS30 + 20;
      drawH = ss + ss * SIN30 + 20;
      const origin = [pad.left + ss * COS30, pad.top + drawH - 10];
      shapes.push({ type: 'cube', origin, size: ss, stroke: '#333', hiddenEdges: data.hiddenEdges !== false, faceFills: data.faceFills || [] });
      break;
    }
    case 'cylinder': {
      const r = dim.radius || 40, h = dim.height || 80;
      const sc = Math.min(70 / r, 120 / h);
      const sr = r * sc, sh = h * sc;
      drawW = sr * 2 + 20;
      drawH = sh + sr * 0.35 + 20;
      const origin = [pad.left + drawW / 2, pad.top + drawH - 10];
      shapes.push({ type: 'cylinder', origin, radius: sr, height: sh, stroke: '#333' });
      break;
    }
    case 'cone': {
      const r = dim.radius || 40, h = dim.height || 80;
      const sc = Math.min(70 / r, 120 / h);
      const sr = r * sc, sh = h * sc;
      drawW = sr * 2 + 20;
      drawH = sh + sr * 0.35 + 20;
      const origin = [pad.left + drawW / 2, pad.top + drawH - 10];
      shapes.push({ type: 'cone', origin, radius: sr, height: sh, stroke: '#333' });
      break;
    }
    case 'sphere': {
      const r = dim.radius || 50;
      const sc = Math.min(70 / r);
      const sr = r * sc;
      drawW = sr * 2 + 20;
      drawH = sr * 2 + 20;
      shapes.push({ type: 'sphere', center: [pad.left + drawW / 2, pad.top + drawH / 2], radius: sr, stroke: '#333' });
      break;
    }
    default:
      break;
  }
  const W = drawW + pad.left + pad.right;
  const H = drawH + pad.top + pad.bottom;
  return { width: W, height: H, shapes, labels, annotations: [] };
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

      // High-level mode
      if (d.shape && !d.shapes) {
        d = shapeToShapes3d(d);
      }

      if (!d.shapes || !d.shapes.length) return;

      const containerWidth = getContainerWidth();
      const scale = Math.min(containerWidth / d.width, 2.0);
      const canvasWidth = Math.floor(d.width * scale);
      const canvasHeight = Math.min(Math.floor(d.height * scale), 280);
      this.setData({ canvasWidth, canvasHeight });

      setTimeout(() => {
        initCanvas(this, 'shape3dCanvas', canvasWidth, canvasHeight, (ctx) => {
          ctx.scale(scale, scale);
          this._drawShapes(ctx, d.shapes);
          this._drawAnnotations(ctx, d.annotations || []);
          this._drawLabels(ctx, d.labels || []);
          ctx.restore();
        });
      }, 20);
    },

    _drawShapes(ctx, shapes) {
      for (const s of shapes) {
        switch (s.type) {
          case 'cuboid':   this._drawCuboid(ctx, s); break;
          case 'cube':     this._drawCube(ctx, s); break;
          case 'cylinder': this._drawCylinder(ctx, s); break;
          case 'cone':     this._drawCone(ctx, s); break;
          case 'sphere':   this._drawSphere(ctx, s); break;
          default: break;
        }
      }
    },

    _cuboidVertices(origin, l, w, h) {
      return {
        fbl: iso(origin, 0, 0, 0), fbr: iso(origin, l, 0, 0),
        bbl: iso(origin, 0, w, 0), bbr: iso(origin, l, w, 0),
        ftl: iso(origin, 0, 0, h), ftr: iso(origin, l, 0, h),
        btl: iso(origin, 0, w, h), btr: iso(origin, l, w, h),
      };
    },

    _strokeEdge(ctx, a, b, stroke, dashed) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke(); ctx.setLineDash([]);
    },

    _fillFace(ctx, pts, fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    },

    _drawCuboid(ctx, s) {
      const v = this._cuboidVertices(s.origin, s.length, s.width, s.height);
      const stroke = s.stroke || '#333';
      const showHidden = s.hiddenEdges !== false;
      const faces = {
        front: [v.fbl, v.fbr, v.ftr, v.ftl], right: [v.fbr, v.bbr, v.btr, v.ftr],
        top: [v.ftl, v.ftr, v.btr, v.btl], back: [v.bbl, v.bbr, v.btr, v.btl],
        left: [v.fbl, v.bbl, v.btl, v.ftl], bottom: [v.fbl, v.fbr, v.bbr, v.bbl],
      };
      if (s.fill) {
        this._fillFace(ctx, faces.top, s.fill);
        this._fillFace(ctx, faces.front, s.fill);
        this._fillFace(ctx, faces.right, s.fill);
      }
      if (s.faceFills) {
        for (const ff of s.faceFills) {
          if (faces[ff.face]) this._fillFace(ctx, faces[ff.face], ff.fill);
        }
      }
      this._strokeEdge(ctx, v.fbl, v.fbr, stroke, false);
      this._strokeEdge(ctx, v.fbr, v.ftr, stroke, false);
      this._strokeEdge(ctx, v.ftr, v.ftl, stroke, false);
      this._strokeEdge(ctx, v.ftl, v.fbl, stroke, false);
      this._strokeEdge(ctx, v.ftl, v.btl, stroke, false);
      this._strokeEdge(ctx, v.ftr, v.btr, stroke, false);
      this._strokeEdge(ctx, v.btl, v.btr, stroke, false);
      this._strokeEdge(ctx, v.fbr, v.bbr, stroke, false);
      this._strokeEdge(ctx, v.bbr, v.btr, stroke, false);
      if (showHidden) {
        this._strokeEdge(ctx, v.bbl, v.bbr, stroke, true);
        this._strokeEdge(ctx, v.bbl, v.fbl, stroke, true);
        this._strokeEdge(ctx, v.bbl, v.btl, stroke, true);
      }
    },

    _drawCube(ctx, s) {
      this._drawCuboid(ctx, { ...s, type: 'cuboid', length: s.size, width: s.size, height: s.size });
    },

    _drawEllipse(ctx, cx, cy, rx, ry, startAngle, endAngle, stroke, dashed, fill) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#333'; ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke(); ctx.setLineDash([]);
    },

    _drawCylinder(ctx, s) {
      const cx = s.origin[0]; const cy = s.origin[1];
      const r = s.radius; const h = s.height;
      const stroke = s.stroke || '#333'; const ry = r * 0.35;
      if (s.fill) {
        ctx.beginPath(); ctx.ellipse(cx, cy - h, r, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx - r, cy - h);
        ctx.ellipse(cx, cy - h, r, ry, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(cx + r, cy); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      this._drawEllipse(ctx, cx, cy, r, ry, 0, Math.PI, stroke, false);
      this._drawEllipse(ctx, cx, cy, r, ry, Math.PI, Math.PI * 2, stroke, true);
      this._drawEllipse(ctx, cx, cy - h, r, ry, 0, Math.PI * 2, stroke, false);
      this._strokeEdge(ctx, [cx - r, cy], [cx - r, cy - h], stroke, false);
      this._strokeEdge(ctx, [cx + r, cy], [cx + r, cy - h], stroke, false);
    },

    _drawCone(ctx, s) {
      const cx = s.origin[0]; const cy = s.origin[1];
      const r = s.radius; const h = s.height;
      const stroke = s.stroke || '#333'; const ry = r * 0.35;
      const apex = [cx, cy - h];
      if (s.fill) {
        ctx.beginPath(); ctx.moveTo(apex[0], apex[1]);
        ctx.lineTo(cx - r, cy); ctx.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true);
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      this._drawEllipse(ctx, cx, cy, r, ry, 0, Math.PI, stroke, false);
      this._drawEllipse(ctx, cx, cy, r, ry, Math.PI, Math.PI * 2, stroke, true);
      this._strokeEdge(ctx, [cx - r, cy], apex, stroke, false);
      this._strokeEdge(ctx, [cx + r, cy], apex, stroke, false);
    },

    _drawSphere(ctx, s) {
      const cx = s.center[0]; const cy = s.center[1];
      const r = s.radius; const stroke = s.stroke || '#333';
      if (s.fill) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
      this._drawEllipse(ctx, cx, cy, r, r * 0.35, 0, Math.PI * 2, stroke, true);
    },

    // ===== Annotations & Labels (same as shape-2d) =====

    _drawAnnotations(ctx, annotations) {
      for (const a of annotations) {
        switch (a.type) {
          case 'dimensionLine': this._drawDimensionLine(ctx, a); break;
          default: break;
        }
      }
    },

    _drawDimensionLine(ctx, a) {
      const from = a.from; const to = a.to;
      const offset = a.offset || 15;
      const perp = perpendicular(from, to);
      const p1 = [from[0] + perp[0] * offset, from[1] + perp[1] * offset];
      const p2 = [to[0] + perp[0] * offset, to[1] + perp[1] * offset];
      const stroke = a.stroke || '#666';
      ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(to[0], to[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      // Simple line (no arrows for simplicity in 3D context)
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
      if (a.text) {
        const mid2 = midpoint(p1, p2);
        ctx.save();
        ctx.fillStyle = '#fff';
        const textW = ctx.measureText(a.text).width;
        ctx.fillRect(mid2[0] - textW / 2 - 2, mid2[1] - 6, textW + 4, 12);
        ctx.fillStyle = stroke; ctx.font = '10px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a.text, mid2[0], mid2[1]);
        ctx.restore();
      }
    },

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
