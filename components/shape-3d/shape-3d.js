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
  const pad = { top: 15, bottom: 15, left: 15, right: 15 };

  let drawW = 160, drawH = 120;
  switch (shape) {
    case 'cuboid': {
      const l = dim.length || 80, w = dim.width || 50, h = dim.height || 60;
      const sc = Math.min(100 / l, 80 / w, 80 / h);
      const sl = l * sc, sw = w * sc, sh = h * sc;
      const isoYBottom = (sl + sw) * SIN30 * 0.5; // y offset below origin from isometric
      drawW = (sl + sw) * COS30 + 10;
      drawH = sh + isoYBottom + 10;
      // Place origin so: top vertex at pad.top+5, bottom vertex at pad.top+drawH-5
      const originY = pad.top + sh + 5;
      const originX = pad.left + sw * COS30 + 5;
      shapes.push({
        type: 'cuboid', origin: [originX, originY], length: sl, width: sw, height: sh,
        stroke: '#333', hiddenEdges: data.hiddenEdges !== false, faceFills: data.faceFills || []
      });
      break;
    }
    case 'cube': {
      const s = dim.length || dim.side || 60;
      const sc = Math.min(90 / s);
      const ss = s * sc;
      const isoYBottom = ss * SIN30;
      drawW = ss * 2 * COS30 + 10;
      drawH = ss + isoYBottom + 10;
      const originY = pad.top + ss + 5;
      const originX = pad.left + ss * COS30 + 5;
      shapes.push({ type: 'cube', origin: [originX, originY], size: ss, stroke: '#333', hiddenEdges: data.hiddenEdges !== false, faceFills: data.faceFills || [] });
      break;
    }
    case 'cylinder': {
      const r = dim.radius || 40, h = dim.height || 80;
      const sc = Math.min(60 / r, 100 / h);
      const sr = r * sc, sh = h * sc;
      const ry = sr * 0.35;
      drawW = sr * 2 + 10;
      drawH = sh + ry * 2 + 10;
      const originX = pad.left + drawW / 2;
      const originY = pad.top + sh + ry + 5;
      shapes.push({ type: 'cylinder', origin: [originX, originY], radius: sr, height: sh, stroke: '#333' });
      break;
    }
    case 'cone': {
      const r = dim.radius || 40, h = dim.height || 80;
      const sc = Math.min(60 / r, 100 / h);
      const sr = r * sc, sh = h * sc;
      const ry = sr * 0.35;
      drawW = sr * 2 + 10;
      drawH = sh + ry + 10;
      const originX = pad.left + drawW / 2;
      const originY = pad.top + sh + ry + 5;
      shapes.push({ type: 'cone', origin: [originX, originY], radius: sr, height: sh, stroke: '#333' });
      break;
    }
    case 'sphere': {
      const r = dim.radius || 50;
      const sc = Math.min(60 / r);
      const sr = r * sc;
      drawW = sr * 2 + 10;
      drawH = sr * 2 + 10;
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

      const viewType = d.viewType || '3d';

      // Net view and orthographic view use their own rendering
      if (d.shape && (viewType === 'net' || viewType === 'orthographic')) {
        if (viewType === 'net') {
          this._renderNet(d);
        } else {
          this._renderOrthographic(d);
        }
        return;
      }

      // High-level mode → isometric 3D
      if (d.shape && !d.shapes) {
        d = shapeToShapes3d(d);
      }

      if (!d.shapes || !d.shapes.length) return;

      const containerWidth = getContainerWidth();
      const scale = Math.min(containerWidth / d.width, 2.0);
      const canvasWidth = Math.floor(d.width * scale);
      const canvasHeight = Math.floor(d.height * scale);
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

    // ===== Net (展开图) =====
    _renderNet(d) {
      const dim = d.dimensions || {};
      const shape = d.shape;
      const containerWidth = getContainerWidth();
      const pad = 15;
      let W, H;

      // Calculate net layout size based on shape
      const faces = [];
      if (shape === 'cuboid' || shape === 'cube') {
        const l = dim.length || dim.side || 60;
        const w = dim.width || (shape === 'cube' ? l : 50);
        const h = dim.height || (shape === 'cube' ? l : 60);
        const sc = Math.min((containerWidth - pad * 2) / (l + 2 * h + 2 * w), 160 / (w + 2 * h));
        const sl = l * sc, sw = w * sc, sh = h * sc;
        // Cross-shaped net: top row(top), middle row(left,front,right,back), bottom row(bottom)
        W = sl + 2 * sh + pad * 2;
        H = sw + 2 * sh + pad * 2;
        const ox = pad + sh, oy = pad + sh; // origin of front face
        // Front
        faces.push({ x: ox, y: oy, w: sl, h: sw, label: '前', fill: 'rgba(91,155,213,0.15)' });
        // Top (above front)
        faces.push({ x: ox, y: oy - sh, w: sl, h: sh, label: '上', fill: 'rgba(112,173,71,0.15)' });
        // Bottom (below front)
        faces.push({ x: ox, y: oy + sw, w: sl, h: sh, label: '下', fill: 'rgba(112,173,71,0.1)' });
        // Left (left of front)
        faces.push({ x: ox - sh, y: oy, w: sh, h: sw, label: '左', fill: 'rgba(237,125,49,0.15)' });
        // Right (right of front)
        faces.push({ x: ox + sl, y: oy, w: sh, h: sw, label: '右', fill: 'rgba(237,125,49,0.1)' });
        // Back (far right of right)
        faces.push({ x: ox + sl + sh, y: oy, w: sl, h: sw, label: '后', fill: 'rgba(91,155,213,0.1)' });
      } else if (shape === 'cylinder') {
        const r = dim.radius || 40, h = dim.height || 80;
        const circumference = 2 * Math.PI * r;
        const sc = Math.min((containerWidth - pad * 2) / circumference, 120 / (2 * r + h));
        const sr = r * sc, sh = h * sc;
        const sCirc = circumference * sc;
        W = sCirc + pad * 2;
        H = 2 * sr + sh + sr + pad * 2; // two circles + rectangle + spacing
        const ox = pad, oy = pad + sr;
        // Top circle
        faces.push({ type: 'circle', cx: ox + sCirc / 2, cy: oy, r: sr, label: '上底', fill: 'rgba(91,155,213,0.15)' });
        // Rectangle (lateral surface)
        faces.push({ x: ox, y: oy + sr + 4, w: sCirc, h: sh, label: '侧面', fill: 'rgba(237,125,49,0.1)' });
        // Bottom circle
        faces.push({ type: 'circle', cx: ox + sCirc / 2, cy: oy + sr + 4 + sh + 4 + sr, r: sr, label: '下底', fill: 'rgba(91,155,213,0.1)' });
        H = oy + sr + 4 + sh + 4 + sr * 2 + pad;
      } else {
        // Fallback to 3D view for unsupported net shapes
        const d2 = Object.assign({}, d, { viewType: '3d' });
        this._render.call(Object.assign({}, this, { data: { data: d2 } }));
        return;
      }

      const canvasWidth = Math.min(Math.floor(W), containerWidth);
      const canvasHeight = Math.min(Math.floor(H), 300);
      this.setData({ canvasWidth, canvasHeight });

      setTimeout(() => {
        initCanvas(this, 'shape3dCanvas', canvasWidth, canvasHeight, (ctx) => {
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (const f of faces) {
            if (f.type === 'circle') {
              ctx.beginPath();
              ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2);
              ctx.fillStyle = f.fill || 'transparent';
              ctx.fill();
              ctx.strokeStyle = '#333';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              ctx.fillStyle = '#666';
              ctx.fillText(f.label, f.cx, f.cy);
            } else {
              ctx.fillStyle = f.fill || 'transparent';
              ctx.fillRect(f.x, f.y, f.w, f.h);
              ctx.strokeStyle = '#333';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(f.x, f.y, f.w, f.h);
              ctx.fillStyle = '#666';
              ctx.fillText(f.label, f.x + f.w / 2, f.y + f.h / 2);
            }
          }
          ctx.restore();
        });
      }, 20);
    },

    // ===== Orthographic (三视图) =====
    _renderOrthographic(d) {
      const dim = d.dimensions || {};
      const shape = d.shape;
      const containerWidth = getContainerWidth();
      const gap = 20, pad = 15, labelH = 18;

      // Calculate 2D projections
      let frontW, frontH, sideW, sideH, topW, topH;
      if (shape === 'cuboid' || shape === 'cube') {
        const l = dim.length || dim.side || 60;
        const w = dim.width || (shape === 'cube' ? l : 50);
        const h = dim.height || (shape === 'cube' ? l : 60);
        const sc = Math.min((containerWidth - pad * 2 - gap) / (l + w), 80 / h);
        frontW = l * sc; frontH = h * sc;
        sideW = w * sc; sideH = h * sc;
        topW = l * sc; topH = w * sc;
      } else if (shape === 'cylinder' || shape === 'cone') {
        const r = dim.radius || 40, h = dim.height || 80;
        const sc = Math.min((containerWidth - pad * 2 - gap) / (r * 4), 80 / h);
        frontW = r * 2 * sc; frontH = h * sc;
        sideW = r * 2 * sc; sideH = h * sc;
        topW = r * 2 * sc; topH = r * 2 * sc;
      } else if (shape === 'sphere') {
        const r = dim.radius || 50;
        const sc = Math.min((containerWidth - pad * 2 - gap) / (r * 4), 80 / (r * 2));
        frontW = r * 2 * sc; frontH = r * 2 * sc;
        sideW = frontW; sideH = frontH;
        topW = frontW; topH = frontH;
      } else {
        return;
      }

      // Layout: front + side on top row, top view below front
      const rowH = Math.max(frontH, sideH);
      const W = pad + frontW + gap + sideW + pad;
      const H = pad + labelH + rowH + gap + labelH + topH + pad;
      const canvasWidth = Math.min(Math.floor(W), containerWidth);
      const canvasHeight = Math.min(Math.floor(H), 320);
      this.setData({ canvasWidth, canvasHeight });

      setTimeout(() => {
        initCanvas(this, 'shape3dCanvas', canvasWidth, canvasHeight, (ctx) => {
          const fx = pad, fy = pad + labelH;
          const sx = pad + frontW + gap, sy = fy;
          const tx = pad, ty = fy + rowH + gap + labelH;

          // Labels
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#666';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('正面', fx + frontW / 2, fy - 3);
          ctx.fillText('侧面', sx + sideW / 2, sy - 3);
          ctx.fillText('上面', tx + topW / 2, ty - 3);

          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#333';

          if (shape === 'cuboid' || shape === 'cube') {
            // Front: rectangle
            ctx.strokeRect(fx, fy, frontW, frontH);
            ctx.fillStyle = 'rgba(91,155,213,0.12)';
            ctx.fillRect(fx, fy, frontW, frontH);
            // Side: rectangle
            ctx.strokeRect(sx, sy, sideW, sideH);
            ctx.fillStyle = 'rgba(237,125,49,0.12)';
            ctx.fillRect(sx, sy, sideW, sideH);
            // Top: rectangle
            ctx.strokeRect(tx, ty, topW, topH);
            ctx.fillStyle = 'rgba(112,173,71,0.12)';
            ctx.fillRect(tx, ty, topW, topH);
          } else if (shape === 'cylinder') {
            // Front: rectangle
            ctx.strokeRect(fx, fy, frontW, frontH);
            ctx.fillStyle = 'rgba(91,155,213,0.12)';
            ctx.fillRect(fx, fy, frontW, frontH);
            // Side: rectangle (same as front)
            ctx.strokeRect(sx, sy, sideW, sideH);
            ctx.fillStyle = 'rgba(237,125,49,0.12)';
            ctx.fillRect(sx, sy, sideW, sideH);
            // Top: circle
            ctx.beginPath();
            ctx.arc(tx + topW / 2, ty + topH / 2, topW / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(112,173,71,0.12)';
            ctx.fill();
            ctx.stroke();
          } else if (shape === 'cone') {
            // Front: triangle
            ctx.beginPath();
            ctx.moveTo(fx + frontW / 2, fy);
            ctx.lineTo(fx, fy + frontH);
            ctx.lineTo(fx + frontW, fy + frontH);
            ctx.closePath();
            ctx.fillStyle = 'rgba(91,155,213,0.12)';
            ctx.fill(); ctx.stroke();
            // Side: triangle (same)
            ctx.beginPath();
            ctx.moveTo(sx + sideW / 2, sy);
            ctx.lineTo(sx, sy + sideH);
            ctx.lineTo(sx + sideW, sy + sideH);
            ctx.closePath();
            ctx.fillStyle = 'rgba(237,125,49,0.12)';
            ctx.fill(); ctx.stroke();
            // Top: circle
            ctx.beginPath();
            ctx.arc(tx + topW / 2, ty + topH / 2, topW / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(112,173,71,0.12)';
            ctx.fill(); ctx.stroke();
          } else if (shape === 'sphere') {
            // All three views: circle
            [{ x: fx, y: fy, w: frontW, h: frontH, c: 'rgba(91,155,213,0.12)' },
             { x: sx, y: sy, w: sideW, h: sideH, c: 'rgba(237,125,49,0.12)' },
             { x: tx, y: ty, w: topW, h: topH, c: 'rgba(112,173,71,0.12)' }].forEach(v => {
              ctx.beginPath();
              ctx.arc(v.x + v.w / 2, v.y + v.h / 2, v.w / 2, 0, Math.PI * 2);
              ctx.fillStyle = v.c;
              ctx.fill(); ctx.stroke();
            });
          }
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
