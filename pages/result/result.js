const app = getApp()
const storage = require('../../utils/storage')

Page({
  data: {
    card: null,
    statusBarHeight: 0,
    copied: false,
    saved: false,
    activeQuestion: 0,
    isFullscreen: false
  },

  onLoad() {
    const result = app.getCurrentResult()
    if (!result) return
    this.setData({
      card: result,
      statusBarHeight: wx.getSystemInfoSync().statusBarHeight
    })
  },

  handleBack() {
    wx.navigateBack()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  handleCopy() {
    const c = this.data.card
    const text = [
      c.title,
      '',
      '【开场白】',
      c.opening,
      '',
      '【故事正文】',
      c.story1Min,
      '',
      '【问孩子】',
      c.questions.join('\n'),
      '',
      '【如果孩子说...】',
      c.responseAdvice,
      '',
      '【不说教提醒】',
      c.noPreachReminder,
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

  nextQuestion() {
    const len = this.data.card.questions.length
    if (len <= 0) return
    this.setData({
      activeQuestion: (this.data.activeQuestion + 1) % len
    })
  },

  openFullscreen() {
    this.setData({ isFullscreen: true })
  },

  closeFullscreen() {
    this.setData({ isFullscreen: false })
  },

  preventBubble() {}
})
