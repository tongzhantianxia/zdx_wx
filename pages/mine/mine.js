Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    questionMode: 'bank',
    normalDucks: 0,
    goldenDucks: 0
  },

  onLoad: function () {
    const mode = wx.getStorageSync('questionMode') || 'bank';
    this.setData({ questionMode: mode });
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 2 });
    }
    const mode = wx.getStorageSync('questionMode') || 'bank';
    this.setData({ questionMode: mode });
    const duckManager = require('../../utils/duckManager.js');
    const duckData = duckManager.getDuckData();
    this.setData({ normalDucks: duckData.normalDucks, goldenDucks: duckData.goldenDucks });
  },

  setMode: function (e) {
    const mode = e.currentTarget.dataset.mode;
    wx.setStorageSync('questionMode', mode);
    this.setData({ questionMode: mode });
    wx.showToast({
      title: mode === 'bank' ? '已切换为真题优先' : '已切换为自动生成',
      icon: 'none'
    });
  }
});
