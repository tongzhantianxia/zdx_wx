const config = require('./config')

const KEYS = config.STORAGE_KEYS

function getFavorites() {
  return wx.getStorageSync(KEYS.favorites) || []
}

function toggleFavorite(item) {
  const favs = getFavorites()
  const idx = favs.findIndex(f => f.id === item.id)
  if (idx > -1) {
    favs.splice(idx, 1)
    wx.setStorageSync(KEYS.favorites, favs)
    return false
  }
  favs.unshift({
    id: item.id,
    text: item.text,
    type: item.type,
    timestamp: Date.now()
  })
  wx.setStorageSync(KEYS.favorites, favs)
  return true
}

function isFavorited(id) {
  const favs = getFavorites()
  return favs.some(f => f.id === id)
}

function getHistory() {
  return wx.getStorageSync(KEYS.history) || []
}

function addHistory(record) {
  const list = getHistory()
  list.unshift({
    type: record.type,
    tips: record.tips,
    timestamp: Date.now()
  })
  if (list.length > config.HISTORY_MAX) {
    list.length = config.HISTORY_MAX
  }
  wx.setStorageSync(KEYS.history, list)
}

function clearHistory() {
  wx.removeStorageSync(KEYS.history)
}

module.exports = {
  getFavorites,
  toggleFavorite,
  isFavorited,
  getHistory,
  addHistory,
  clearHistory
}
