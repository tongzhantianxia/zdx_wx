function copyText(text) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: () => resolve(true),
      fail: (err) => reject(err)
    })
  })
}

module.exports = { copyText }
