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

Component({
  properties: {
    diagram: {
      type: Object,
      value: null,
      observer: '_onDiagramChange'
    }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200
  },

  lifetimes: {
    attached() {
      if (this.data.diagram) {
        this._initCanvas();
      }
    }
  },

  methods: {
    _onDiagramChange(val) {
      if (val) {
        this._initCanvas();
      }
    },

    _initCanvas() {
      const query = this.createSelectorQuery();
      query.select('#geoCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          setTimeout(() => this._initCanvas(), 50);
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        const diagram = this.data.diagram;
        if (!diagram) return;

        const sysInfo = wx.getWindowInfo();
        const containerWidth = sysInfo.windowWidth - 40;
        const scale = containerWidth / diagram.width;
        const canvasWidth = Math.floor(diagram.width * scale);
        const canvasHeight = Math.floor(diagram.height * scale);

        this.setData({ canvasWidth, canvasHeight });

        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr * scale, dpr * scale);

        this._drawShapes(ctx, diagram.shapes || []);
        this._drawAnnotations(ctx, diagram.annotations || []);
        this._drawLabels(ctx, diagram.labels || []);

        ctx.restore();
      });
    },

    // ==================== SHAPES ====================

    _drawShapes(ctx, shapes) {
      for (const s of shapes) {
        switch (s.type) {
          case 'polygon':  this._drawPolygon(ctx, s); break;
          case 'circle':   this._drawCircle(ctx, s); break;
          case 'line':     this._drawLine(ctx, s); break;
          case 'arc':      this._drawArc(ctx, s); break;
          case 'dashed':   this._drawDashed(ctx, s); break;
          case 'cuboid':   this._drawCuboid(ctx, s); break;
          case 'cube':     this._drawCube(ctx, s); break;
          case 'cylinder': this._drawCylinder(ctx, s); break;
          case 'cone':     this._drawCone(ctx, s); break;
          case 'sphere':   this._drawSphere(ctx, s); break;
          default: break;
        }
      }
    },

    _drawPolygon(ctx, s) {
      const pts = s.points;
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
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

    // ==================== 3D ISOMETRIC ====================

    _cuboidVertices(origin, l, w, h) {
      // 8 vertices: 0-3 bottom, 4-7 top
      // lx=length along X-axis, ly=width along Y-axis, lz=height
      return {
        fbl: iso(origin, 0, 0, 0),    // front-bottom-left
        fbr: iso(origin, l, 0, 0),    // front-bottom-right
        bbl: iso(origin, 0, w, 0),    // back-bottom-left
        bbr: iso(origin, l, w, 0),    // back-bottom-right
        ftl: iso(origin, 0, 0, h),    // front-top-left
        ftr: iso(origin, l, 0, h),    // front-top-right
        btl: iso(origin, 0, w, h),    // back-top-left
        btr: iso(origin, l, w, h),    // back-top-right
      };
    },

    _strokeEdge(ctx, a, b, stroke, dashed) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    _fillFace(ctx, pts, fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    },

    _drawCuboid(ctx, s) {
      const v = this._cuboidVertices(s.origin, s.length, s.width, s.height);
      const stroke = s.stroke || '#333';
      const showHidden = s.hiddenEdges !== false;

      const faces = {
        front:  [v.fbl, v.fbr, v.ftr, v.ftl],
        right:  [v.fbr, v.bbr, v.btr, v.ftr],
        top:    [v.ftl, v.ftr, v.btr, v.btl],
        back:   [v.bbl, v.bbr, v.btr, v.btl],
        left:   [v.fbl, v.bbl, v.btl, v.ftl],
        bottom: [v.fbl, v.fbr, v.bbr, v.bbl],
      };

      if (s.fill) {
        this._fillFace(ctx, faces.top, s.fill);
        this._fillFace(ctx, faces.front, s.fill);
        this._fillFace(ctx, faces.right, s.fill);
      }

      if (s.faceFills) {
        for (const ff of s.faceFills) {
          if (faces[ff.face]) {
            this._fillFace(ctx, faces[ff.face], ff.fill);
          }
        }
      }

      // Visible edges: front face, top receding, right receding
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
      this._drawCuboid(ctx, {
        ...s,
        type: 'cuboid',
        length: s.size,
        width: s.size,
        height: s.size
      });
    },

    _drawEllipse(ctx, cx, cy, rx, ry, startAngle, endAngle, stroke, dashed, fill) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke || '#333';
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    },

    _drawCylinder(ctx, s) {
      const cx = s.origin[0];
      const cy = s.origin[1];
      const r = s.radius;
      const h = s.height;
      const stroke = s.stroke || '#333';
      const ry = r * 0.35;

      if (s.fill) {
        ctx.beginPath();
        ctx.ellipse(cx, cy - h, r, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = s.fill;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx - r, cy - h);
        ctx.ellipse(cx, cy - h, r, ry, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(cx + r, cy);
        ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
        ctx.closePath();
        ctx.fillStyle = s.fill;
        ctx.fill();
      }

      // Bottom ellipse: front half solid, back half dashed
      this._drawEllipse(ctx, cx, cy, r, ry, 0, Math.PI, stroke, false);
      this._drawEllipse(ctx, cx, cy, r, ry, Math.PI, Math.PI * 2, stroke, true);

      // Top ellipse: full solid
      this._drawEllipse(ctx, cx, cy - h, r, ry, 0, Math.PI * 2, stroke, false);

      // Side lines
      this._strokeEdge(ctx, [cx - r, cy], [cx - r, cy - h], stroke, false);
      this._strokeEdge(ctx, [cx + r, cy], [cx + r, cy - h], stroke, false);
    },

    _drawCone(ctx, s) {
      const cx = s.origin[0];
      const cy = s.origin[1];
      const r = s.radius;
      const h = s.height;
      const stroke = s.stroke || '#333';
      const ry = r * 0.35;
      const apex = [cx, cy - h];

      if (s.fill) {
        ctx.beginPath();
        ctx.moveTo(apex[0], apex[1]);
        ctx.lineTo(cx - r, cy);
        ctx.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fillStyle = s.fill;
        ctx.fill();
      }

      // Bottom ellipse: front half solid, back half dashed
      this._drawEllipse(ctx, cx, cy, r, ry, 0, Math.PI, stroke, false);
      this._drawEllipse(ctx, cx, cy, r, ry, Math.PI, Math.PI * 2, stroke, true);

      // Lines from edges to apex
      this._strokeEdge(ctx, [cx - r, cy], apex, stroke, false);
      this._strokeEdge(ctx, [cx + r, cy], apex, stroke, false);
    },

    _drawSphere(ctx, s) {
      const cx = s.center[0];
      const cy = s.center[1];
      const r = s.radius;
      const stroke = s.stroke || '#333';

      if (s.fill) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = s.fill;
        ctx.fill();
      }

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Dashed equator ellipse
      this._drawEllipse(ctx, cx, cy, r, r * 0.35, 0, Math.PI * 2, stroke, true);
    },

    // ==================== ANNOTATIONS ====================

    _drawAnnotations(ctx, annotations) {
      for (const a of annotations) {
        switch (a.type) {
          case 'rightAngle':   this._drawRightAngle(ctx, a); break;
          case 'shade':        this._drawShade(ctx, a); break;
          case 'arrow':        this._drawArrow(ctx, a); break;
          case 'parallel':     this._drawParallel(ctx, a); break;
          case 'equal':        this._drawEqual(ctx, a); break;
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
      ctx.lineTo(
        to[0] - headLen * Math.cos(angle - Math.PI / 6),
        to[1] - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to[0] - headLen * Math.cos(angle + Math.PI / 6),
        to[1] - headLen * Math.sin(angle + Math.PI / 6)
      );
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
      this._strokeEdge(ctx, from, p1, stroke, false);
      this._strokeEdge(ctx, to, p2, stroke, false);

      // Dimension line with arrows
      this._drawArrow(ctx, { from: p1, to: p2, stroke, headLength: 5 });
      this._drawArrow(ctx, { from: p2, to: p1, stroke, headLength: 5 });

      // Text label
      if (a.text) {
        const mid = midpoint(p1, p2);
        ctx.save();
        ctx.fillStyle = '#fff';
        const textW = ctx.measureText(a.text).width;
        ctx.fillRect(mid[0] - textW / 2 - 2, mid[1] - 6, textW + 4, 12);
        ctx.fillStyle = stroke;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(a.text, mid[0], mid[1]);
        ctx.restore();
      }
    },

    // ==================== LABELS ====================

    _drawLabels(ctx, labels) {
      for (const l of labels) {
        const fontSize = l.fontSize || 12;
        ctx.font = `${l.bold ? 'bold ' : ''}${fontSize}px sans-serif`;
        ctx.fillStyle = l.color || '#333';
        ctx.textAlign = l.align || 'center';
        ctx.textBaseline = l.baseline || 'middle';
        ctx.fillText(l.text, l.position[0], l.position[1]);
      }
    }
  }
});
