Component({
  properties: {
    numerator: { type: Number, value: 1 },
    denominator: { type: Number, value: 2 },
    width: { type: Number, value: 280 },
    height: { type: Number, value: 50 },
    color: { type: String, value: '#4A90E2' },
    showLabel: { type: Boolean, value: true }
  },

  data: {},

  lifetimes: {
    attached() {
      this.drawFractionBar();
    }
  },

  observers: {
    'numerator, denominator': function() {
      this.drawFractionBar();
    }
  },

  methods: {
    drawFractionBar() {
      const query = this.createSelectorQuery();
      query.select('#fractionBarCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        const { numerator, denominator, width, height, color, showLabel } = this.data;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, width, height);
        
        const barHeight = 30;
        const barY = (height - barHeight) / 2;
        const unitWidth = width / denominator;
        
        for (let i = 0; i < denominator; i++) {
          const x = i * unitWidth;
          
          if (i < numerator) {
            ctx.fillStyle = color;
            ctx.fillRect(x + 1, barY + 1, unitWidth - 2, barHeight - 2);
          } else {
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, barY + 1, unitWidth - 2, barHeight - 2);
          }
        }
        
        if (showLabel) {
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.fillText(`${numerator}/${denominator}`, width / 2, height - 8);
        }
      });
    }
  }
});