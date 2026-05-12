const app = getApp()
const storage = require('../../utils/storage')

Page({
  data: {
    statusBarHeight: 0,
    savedCards: []
  },

  onLoad() {
    const { statusBarHeight } = wx.getSystemInfoSync()
    this.setData({ statusBarHeight })
  },

  onShow() {
    this.setData({ savedCards: storage.getSavedCards() })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  handleOpenCard(e) {
    const id = e.currentTarget.dataset.id
    const card = this.data.savedCards.find(c => c.id === id)
    if (card) {
      app.setCurrentResult(card)
      wx.navigateTo({ url: '/pages/result/result' })
    }
  },

  handleRemoveCard(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      confirmColor: '#b85b3d',
      success: (res) => {
        if (res.confirm) {
          storage.removeCard(id)
          this.setData({ savedCards: storage.getSavedCards() })
        }
      }
    })
  },

  handleGoCreate() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
