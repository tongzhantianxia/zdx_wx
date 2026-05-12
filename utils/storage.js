const config = require('./config')

function getSavedCards() {
  try {
    return wx.getStorageSync(config.STORAGE_KEYS.savedCards) || []
  } catch (e) {
    return []
  }
}

function saveCard(card) {
  const cards = getSavedCards()
  if (cards.find(c => c.id === card.id)) return false
  cards.unshift(card)
  if (cards.length > config.SAVED_CARDS_MAX) {
    cards.length = config.SAVED_CARDS_MAX
  }
  wx.setStorageSync(config.STORAGE_KEYS.savedCards, cards)
  return true
}

function removeCard(id) {
  const cards = getSavedCards().filter(c => c.id !== id)
  wx.setStorageSync(config.STORAGE_KEYS.savedCards, cards)
}

function getGenerateCount() {
  try {
    return wx.getStorageSync(config.STORAGE_KEYS.generateCount) || 0
  } catch (e) {
    return 0
  }
}

function setGenerateCount(count) {
  wx.setStorageSync(config.STORAGE_KEYS.generateCount, count)
}

function isOnboardingShown() {
  try {
    return !!wx.getStorageSync(config.STORAGE_KEYS.onboardingShown)
  } catch (e) {
    return false
  }
}

function setOnboardingShown() {
  wx.setStorageSync(config.STORAGE_KEYS.onboardingShown, true)
}

function getLastAge() {
  try {
    return wx.getStorageSync(config.STORAGE_KEYS.lastSelectedAge) || '3-5岁'
  } catch (e) {
    return '3-5岁'
  }
}

function setLastAge(age) {
  wx.setStorageSync(config.STORAGE_KEYS.lastSelectedAge, age)
}

function getLastNarrator() {
  try {
    return wx.getStorageSync(config.STORAGE_KEYS.lastSelectedNarrator) || '妈妈'
  } catch (e) {
    return '妈妈'
  }
}

function setLastNarrator(narrator) {
  wx.setStorageSync(config.STORAGE_KEYS.lastSelectedNarrator, narrator)
}

module.exports = {
  getSavedCards,
  saveCard,
  removeCard,
  getGenerateCount,
  setGenerateCount,
  isOnboardingShown,
  setOnboardingShown,
  getLastAge,
  setLastAge,
  getLastNarrator,
  setLastNarrator
}
