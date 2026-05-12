const app = getApp()
const storage = require('../../utils/storage')
const config = require('../../utils/config')

Page({
  data: {
    generateCount: 0,
    savedCount: 0,
    version: '',
    statusBarHeight: 0
  },

  onLoad() {
    this.setData({
      statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
      version: config.VERSION
    })
  },

  onShow() {
    this.setData({
      generateCount: app.globalData.generateCount,
      savedCount: storage.getSavedCards().length
    })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  goToStoryBox() {
    wx.switchTab({ url: '/pages/story-box/story-box' })
  }
})
