const storage = require('../../utils/storage')
const clipboard = require('../../utils/clipboard')
const config = require('../../utils/config')
const app = getApp()

Page({
  data: {
    currentTab: 0,
    favorites: [],
    history: [],
    showCompliance: false,
    version: config.VERSION
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }

    const mineTab = app.globalData.mineTab
    if (mineTab !== undefined) {
      this.setData({ currentTab: mineTab })
      app.globalData.mineTab = 0
    }

    this._loadData()
  },

  _loadData() {
    const favorites = storage.getFavorites()
    const history = storage.getHistory().map(item => ({
      ...item,
      timestamp: this._formatTime(item.timestamp)
    }))
    this.setData({ favorites, history })
  },

  _formatTime(ts) {
    const d = new Date(ts)
    const M = d.getMonth() + 1
    const D = d.getDate()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${M}/${D} ${h}:${m}`
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  onCopyFav(e) {
    const { text } = e.currentTarget.dataset
    clipboard.copyText(text).then(() => {
      this.selectComponent('#toast').show('复制成功')
    }).catch(() => {
      this.selectComponent('#toast').show('复制失败')
    })
  },

  onRemoveFav(e) {
    const { id, text, type } = e.currentTarget.dataset
    storage.toggleFavorite({ id, text, type })
    this._loadData()
    this.selectComponent('#toast').show('已取消收藏')
  },

  onCopyHistory(e) {
    const { index } = e.currentTarget.dataset
    const group = this.data.history[index]
    const text = group.tips.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
    clipboard.copyText(text).then(() => {
      this.selectComponent('#toast').show('复制成功')
    }).catch(() => {
      this.selectComponent('#toast').show('复制失败')
    })
  },

  onFavFromHistory(e) {
    const { id, text, type } = e.currentTarget.dataset
    const added = storage.toggleFavorite({ id, text, type })
    this.selectComponent('#toast').show(added ? '已收藏' : '已取消收藏')
    this._loadData()
  },

  onClearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有话术历史记录吗？',
      confirmColor: '#FF8C42',
      success: (res) => {
        if (res.confirm) {
          storage.clearHistory()
          this._loadData()
          this.selectComponent('#toast').show('已清空历史')
        }
      }
    })
  },

  onShowCompliance() {
    this.setData({ showCompliance: true })
  },

  onCloseCompliance() {
    this.setData({ showCompliance: false })
  }
})
