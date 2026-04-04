Component({
  properties: {
    count: { type: Number, value: 5 },
    rows: { type: Number, value: 2 },
    cols: { type: Number, value: 5 },
    color: { type: String, value: '#4A90E2' },
    emptyColor: { type: String, value: '#e0e0e0' },
    width: { type: Number, value: 280 },
    itemSize: { type: Number, value: 24 },
    gap: { type: Number, value: 4 }
  },

  data: {},

  lifetimes: {
    attached() {
      this.drawCounting();
    }
  },

  observers: {
    'count, rows, cols': function() {
      this.drawCounting();
    }
  },

  methods: {
    drawCounting() {
      const query = this.createSelectorQuery();
      query.select('#countingCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 2;
        const { count, rows, cols, color, emptyColor, itemSize, gap } = this.data;
        
        const totalWidth = cols * itemSize + (cols - 1) * gap;
        const totalHeight = rows * itemSize + (rows - 1) * gap;
        
        canvas.width = totalWidth * dpr;
        canvas.height = totalHeight * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, totalWidth, totalHeight);
        
        let drawn = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * (itemSize + gap);
            const y = r * (itemSize + gap);
            
            ctx.beginPath();
            ctx.arc(x + itemSize / 2, y + itemSize / 2, itemSize / 2 - 1, 0, Math.PI * 2);
            
            if (drawn < count) {
              ctx.fillStyle = color;
              ctx.fill();
              drawn++;
            } else {
              ctx.strokeStyle = emptyColor;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }
        }
      });
    }
  }
});