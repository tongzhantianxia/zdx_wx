Page({
  data: {
    statusBarHeight: 0,
    questionMode: 'bank'
  },

  onLoad: function () {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });
    const mode = wx.getStorageSync('questionMode') || 'bank';
    this.setData({ questionMode: mode });
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 2 });
    }
    const mode = wx.getStorageSync('questionMode') || 'bank';
    this.setData({ questionMode: mode });
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
