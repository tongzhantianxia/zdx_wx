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

    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow: function () {
    // 小程序显示时的逻辑
  },

  onHide: function () {
    // 小程序隐藏时的逻辑
  },

  // 检查登录状态
  checkLoginStatus: function () {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    } else {
      this.globalData.isLoggedIn = false;
    }
  },

  // 用户登录
  login: function () {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        data: {},
        success: res => {
          const userInfo = res.result;
          this.globalData.userInfo = userInfo;
          this.globalData.isLoggedIn = true;
          wx.setStorageSync('userInfo', userInfo);
          resolve(userInfo);
        },
        fail: err => {
          console.error('登录失败：', err);
          reject(err);
        }
      });
    });
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

    // 错题相关数据
    currentPractice: null,  // 当前练习数据
    wrongQuestions: [],      // 错题列表
    practiceHistory: [],     // 练习历史

    // 学科配置
    subjects: ['数学'],
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],

    // 题目类型配置
    questionTypes: {
      addition: { name: '加法', icon: '+' },
      subtraction: { name: '减法', icon: '-' },
      multiplication: { name: '乘法', icon: '×' },
      division: { name: '除法', icon: '÷' },
      mixed: { name: '混合运算', icon: '=' }
    }
  }
});
