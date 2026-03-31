// app.js
App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'your-cloud-env-id', // 请替换为你的云开发环境ID
        traceUser: true,
      });
    }

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.screenWidth = systemInfo.screenWidth;
    this.globalData.screenHeight = systemInfo.screenHeight;

    // 检查隐私协议
    this.checkPrivacyAgreement();
  },

  onShow: function () {
    // 小程序显示时的逻辑
  },

  onHide: function () {
    // 小程序隐藏时的逻辑
  },

  // 检查隐私协议
  checkPrivacyAgreement: function () {
    const agreed = wx.getStorageSync('privacy_agreed');
    if (!agreed) {
      wx.redirectTo({
        url: '/pages/privacy/privacy'
      });
    }
  },

  // 获取用户信息
  getUserInfo: function () {
    return this.globalData.userInfo;
  },

  // 更新用户信息
  updateUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
  },

  // 全局数据
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    systemInfo: null,
    statusBarHeight: 0,
    screenWidth: 0,
    screenHeight: 0,

    // 当前练习数据
    currentPractice: null,
    currentQuestions: [],

    // 学科配置
    subjects: ['数学'],
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
  }
});
