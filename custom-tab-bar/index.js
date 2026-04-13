Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/math-guide/math-guide',
        text: '数学引导',
        iconPath: '/images/tabbar/math.png',
        selectedIconPath: '/images/tabbar/math-active.png'
      },
      {
        pagePath: '/pages/writing-guide/writing-guide',
        text: '作文引导',
        iconPath: '/images/tabbar/writing.png',
        selectedIconPath: '/images/tabbar/writing-active.png'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        iconPath: '/images/tabbar/mine.png',
        selectedIconPath: '/images/tabbar/mine-active.png'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
