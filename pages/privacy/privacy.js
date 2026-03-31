// pages/privacy/privacy.js
Page({
  data: {},

  onLoad: function (options) {
    // 从参数获取来源页面
    this.fromPage = options.from || '';
  },

  handleAgree: function () {
    // 保存用户已同意隐私协议
    wx.setStorageSync('privacy_agreed', true);

    // 跳转到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
