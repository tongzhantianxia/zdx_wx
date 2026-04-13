const storage = require('../../utils/storage')
const app = getApp()

Page({
  data: {
    tips: [],
    loading: false,
    error: false,
    showCompliance: false
  },

  _lastRequestTime: 0,

  onLoad() {
    this.fetchTips()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    if (!app.globalData.writingModalShown) {
      this.setData({ showCompliance: true })
      app.globalData.writingModalShown = true
    }
    this._refreshFavState()
  },

  fetchTips() {
    const now = Date.now()
    if (now - this._lastRequestTime < 5000) {
      this.selectComponent('#toast').show('请稍后再试')
      return
    }
    this._lastRequestTime = now

    this.setData({ loading: true, error: false })
    wx.cloud.callFunction({
      name: 'generateGuide',
      data: { type: 'writing' }
    }).then(res => {
      const result = res.result
      if (result.success) {
        const tips = result.data.tips.map(t => ({
          ...t,
          favorited: storage.isFavorited(t.id)
        }))
        this.setData({ tips, loading: false })
        storage.addHistory({ type: 'writing', tips: result.data.tips })
      } else {
        this.setData({ loading: false, error: true })
        this.selectComponent('#toast').show(result.error || '获取失败')
      }
    }).catch(() => {
      this.setData({ loading: false, error: true })
    })
  },

  onRefresh() {
    this.fetchTips()
  },

  onToggleFav(e) {
    const { id, text, type } = e.detail
    const added = storage.toggleFavorite({ id, text, type })
    this.selectComponent('#toast').show(added ? '已收藏' : '已取消收藏')
    this._refreshFavState()
  },

  onToast(e) {
    this.selectComponent('#toast').show(e.detail.message)
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
  },

  onShowCompliance() {
    this.setData({ showCompliance: true })
  },

  _refreshFavState() {
    const tips = this.data.tips.map(t => ({
      ...t,
      favorited: storage.isFavorited(t.id)
    }))
    this.setData({ tips })
  }
})
