Component({
  data: {
    active: 0,
    list: [
      {
        pagePath: '/pages/improve/improve',
        text: '错题',
        icon: 'improve'
      },
      {
        pagePath: '/pages/practice-select/practice-select',
        text: '针对练习',
        icon: 'practice'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        icon: 'mine'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      wx.switchTab({ url: item.pagePath });
    }
  }
});
