// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-0gfe5z1qae319fb6',
        traceUser: true,
      });
    }

    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.screenWidth = systemInfo.screenWidth;
    this.globalData.screenHeight = systemInfo.screenHeight;

    this.checkPrivacyAgreement();

    const duckManager = require('./utils/duckManager.js');
    this.globalData.duckData = duckManager.getDuckData();
  },

  checkPrivacyAgreement: function () {
    const agreed = wx.getStorageSync('privacy_agreed');
    if (!agreed) {
      wx.redirectTo({ url: '/pages/privacy/privacy' });
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    screenWidth: 0,
    screenHeight: 0,
    currentPractice: null,
    currentQuestions: [],
    duckData: null,
  }
});
