const app = getApp()
const storage = require('../../utils/storage')

Page({
  data: {
    card: null,
    statusBarHeight: 0,
    copied: false,
    saved: false,
    collected: false
  },

  onLoad() {
    const result = app.getCurrentResult()
    if (!result) {
      wx.navigateBack()
      return
    }
    const collected = storage.isCardSaved
      ? storage.isCardSaved(result)
      : false
    this.setData({
      card: result,
      statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
      collected
    })
  },

  handleBack() {
    wx.navigateBack()
  },

  handleCopy() {
    const c = this.data.card
    const text = [
      c.title,
      '',
      '【开场白】',
      c.opening,
      '',
      '【1分钟讲述】',
      c.story1Min,
      '',
      '【问孩子】',
      c.questions.join('\n'),
      '',
      '【如果孩子说...】',
      c.responseAdvice,
      '',
      '【今日小行动】',
      c.smallAction
    ].join('\n')
    wx.setClipboardData({
      data: text,
      success: () => {
        this.setData({ copied: true })
        setTimeout(() => this.setData({ copied: false }), 2000)
      }
    })
  },

  handleSave() {
    storage.saveCard(this.data.card)
    this.setData({ saved: true })
    setTimeout(() => this.setData({ saved: false }), 2000)
  },

  handleRegenerate() {
    wx.navigateBack()
  },

  handleCollect() {
    if (this.data.collected) return
    storage.saveCard(this.data.card)
    this.setData({ collected: true })
    wx.showToast({ title: '已收藏', icon: 'success' })
  }
})
