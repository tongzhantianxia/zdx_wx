Component({
  properties: {
    start: { type: Number, value: 0 },
    end: { type: Number, value: 10 },
    step: { type: Number, value: 1 },
    showNegative: { type: Boolean, value: false },
    highlightPoints: { type: Array, value: [] },
    labels: { type: Array, value: [] },
    width: { type: Number, value: 320 },
    height: { type: Number, value: 80 }
  },

  data: {
    points: []
  },

  lifetimes: {
    attached() {
      this.initData();
    }
  },

  observers: {
    'start, end, step, highlightPoints': function() {
      this.initData();
    }
  },

  methods: {
    initData() {
      const { start, end, step, highlightPoints, labels } = this.data;
      const points = [];
      
      for (let i = start; i <= end; i += step) {
        const isHighlighted = highlightPoints.some(p => p == i);
        const labelInfo = labels.find(l => l.position == i);
        points.push({
          value: i,
          isHighlighted,
          label: labelInfo ? labelInfo.text : null,
          labelAbove: labelInfo ? labelInfo.above : true
        });
      }
      
      this.setData({ points });
      this.drawNumberLine();
    },

    drawNumberLine() {
      const query = this.createSelectorQuery();
      query.select('#numberLineCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        const { width, height, points } = this.data;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        // 绘制数轴主线
        const lineY = height / 2;
        ctx.beginPath();
        ctx.moveTo(10, lineY);
        ctx.lineTo(width - 10, lineY);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制箭头
        ctx.beginPath();
        ctx.moveTo(width - 10, lineY);
        ctx.lineTo(width - 20, lineY - 5);
        ctx.lineTo(width - 20, lineY + 5);
        ctx.closePath();
        ctx.fillStyle = '#333';
        ctx.fill();
        
        // 计算刻度位置
        const padding = 30;
        const axisWidth = width - padding * 2;
        const range = (this.data.end - this.data.start) / this.data.step;
        const tickGap = axisWidth / range;
        
        // 绘制刻度和数字
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        points.forEach((p, i) => {
          const x = padding + i * tickGap;
          
          // 刻度线
          ctx.beginPath();
          ctx.moveTo(x, lineY - 8);
          ctx.lineTo(x, lineY + 8);
          ctx.strokeStyle = p.isHighlighted ? '#4A90E2' : '#666';
          ctx.lineWidth = p.isHighlighted ? 2 : 1;
          ctx.stroke();
          
          // 数字
          ctx.font = p.isHighlighted ? 'bold 14px sans-serif' : '12px sans-serif';
          ctx.fillStyle = p.isHighlighted ? '#4A90E2' : '#333';
          ctx.fillText(p.value.toString(), x, lineY + 12);
          
          // 标签（如分数）
          if (p.label) {
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#4A90E2';
            ctx.fillText(p.label, x, lineY - 22);
          }
        });
      });
    },

    onPointTap(e) {
      const value = e.currentTarget.dataset.value;
      this.triggerEvent('pointTap', { value });
    }
  }
});