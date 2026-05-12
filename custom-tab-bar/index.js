Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconType: 'home'
      },
      {
        pagePath: '/pages/story-box/story-box',
        text: '故事盒子',
        iconType: 'book'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconType: 'user'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const url = e.currentTarget.dataset.path
      wx.switchTab({ url })
    }
  }
})
