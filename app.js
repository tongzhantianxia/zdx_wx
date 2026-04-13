const config = require('./utils/config')

App({
  globalData: {
    mathModalShown: false,
    writingModalShown: false,
    mineTab: 0
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      traceUser: true
    })

    const shown = wx.getStorageSync(config.STORAGE_KEYS.complianceShown)
    if (!shown) {
      this.globalData.showComplianceOnLaunch = true
    }
  }
})
