const config = require('../../utils/config')
const app = getApp()

Page({
  data: {
    showCompliance: false,
    features: [
      { key: 'math', title: '数学思考引导', icon: '🔢', desc: '引导孩子自主思考' },
      { key: 'writing', title: '作文表达引导', icon: '✏️', desc: '启发孩子主动表达' },
      { key: 'favorites', title: '我的收藏', icon: '⭐', desc: '常用话术随时查看' },
      { key: 'history', title: '话术历史', icon: '📋', desc: '回顾过往引导内容' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    if (app.globalData.showComplianceOnLaunch) {
      this.setData({ showCompliance: true })
      app.globalData.showComplianceOnLaunch = false
    }
  },

  onFeatureTap(e) {
    const { key } = e.currentTarget.dataset
    switch (key) {
      case 'math':
        wx.switchTab({ url: '/pages/math-guide/math-guide' })
        break
      case 'writing':
        wx.switchTab({ url: '/pages/writing-guide/writing-guide' })
        break
      case 'favorites':
        app.globalData.mineTab = 0
        wx.switchTab({ url: '/pages/mine/mine' })
        break
      case 'history':
        app.globalData.mineTab = 1
        wx.switchTab({ url: '/pages/mine/mine' })
        break
    }
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
    wx.setStorageSync(config.STORAGE_KEYS.complianceShown, true)
  }
})
