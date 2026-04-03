const duckManager = require('../../utils/duckManager.js');

Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    questionMode: 'bank',
    normalDucks: 0,
    goldenDucks: 0,
    swans: 0
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
    this.refreshDuckData();
  },

  refreshDuckData: function () {
    const data = duckManager.getDuckData();
    this.setData({
      normalDucks: data.normalDucks,
      goldenDucks: data.goldenDucks,
      swans: data.swans || 0
    });
  },

  onDuckMerge: function (e) {
    const { type } = e.detail;
    if (type === 'golden') {
      const result = duckManager.mergeToGolden();
      if (result.success) {
        wx.showToast({ title: '合成金色鸭子！', icon: 'none' });
        wx.vibrateShort({ type: 'medium' });
      } else {
        wx.showToast({ title: '普通鸭不足12只', icon: 'none' });
      }
    } else if (type === 'swan') {
      const result = duckManager.mergeToSwan();
      if (result.success) {
        wx.showToast({ title: '合成白天鹅！', icon: 'none' });
        wx.vibrateShort({ type: 'heavy' });
      } else {
        wx.showToast({ title: '金色鸭不足10只', icon: 'none' });
      }
    }
    this.refreshDuckData();
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
