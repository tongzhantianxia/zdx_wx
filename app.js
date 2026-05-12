const storage = require('./utils/storage')

App({
  globalData: {
    currentResult: null,
    generateCount: 0
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({ traceUser: true })

    this.globalData.generateCount = storage.getGenerateCount()
  },

  setCurrentResult(card) {
    this.globalData.currentResult = card
  },

  getCurrentResult() {
    return this.globalData.currentResult
  },

  incrementGenerateCount() {
    this.globalData.generateCount++
    storage.setGenerateCount(this.globalData.generateCount)
  }
})
