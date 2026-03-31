// pages/index/index.js
const app = getApp();

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    gradeText: '请选择年级',
    stats: [
      { id: 1, label: '今日练习', value: 0 },
      { id: 2, label: '错题数', value: 0 },
      { id: 3, label: '正确率', value: '0%' }
    ],
    menuItems: [
      {
        id: 1,
        name: '错题练习',
        desc: '针对性复习',
        type: 'wrong',
        icon: '✎',
        bgColor: '#FF6B6B'
      },
      {
        id: 2,
        name: '随机练习',
        desc: '巩固知识点',
        type: 'random',
        icon: '?',
        bgColor: '#4ECDC4'
      },
      {
        id: 3,
        name: '专项训练',
        desc: '强化薄弱项',
        type: 'special',
        icon: '★',
        bgColor: '#FFE66D'
      },
      {
        id: 4,
        name: '模拟测试',
        desc: '检验学习成果',
        type: 'exam',
        icon: '✓',
        bgColor: '#95E1D3'
      }
    ],
    recentWrongQuestions: []
  },

  onLoad: function () {
    this.initPage();
  },

  onShow: function () {
    this.refreshStats();
  },

  // 初始化页面
  initPage: function () {
    const isLoggedIn = app.globalData.isLoggedIn;
    const userInfo = app.globalData.userInfo;

    this.setData({
      isLoggedIn,
      userInfo
    });

    if (isLoggedIn && userInfo) {
      this.setData({
        gradeText: userInfo.grade || '请选择年级'
      });
    }

    this.loadRecentWrongQuestions();
  },

  // 刷新统计数据
  refreshStats: function () {
    // 从云数据库获取统计数据
    this.loadStats();
  },

  // 加载统计数据
  loadStats: function () {
    const db = wx.cloud.database();

    // 获取今日练习数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    db.collection('practice_records')
      .where({
        _openid: '{openid}',
        createTime: db.command.gte(today)
      })
      .count()
      .then(res => {
        this.setData({
          'stats[0].value': res.total
        });
      })
      .catch(err => {
        console.error('获取统计数据失败：', err);
      });

    // 获取错题数
    db.collection('wrong_questions')
      .where({
        _openid: '{openid}',
        mastered: false
      })
      .count()
      .then(res => {
        this.setData({
          'stats[1].value': res.total
        });
      })
      .catch(err => {
        console.error('获取错题数失败：', err);
      });

    // 计算正确率
    db.collection('practice_records')
      .where({
        _openid: '{openid}'
      })
      .limit(100)
      .get()
      .then(res => {
        const records = res.data;
        if (records.length > 0) {
          const correctCount = records.filter(r => r.isCorrect).length;
          const accuracy = Math.round((correctCount / records.length) * 100);
          this.setData({
            'stats[2].value': accuracy + '%'
          });
        }
      })
      .catch(err => {
        console.error('获取正确率失败：', err);
      });
  },

  // 加载最近错题
  loadRecentWrongQuestions: function () {
    const db = wx.cloud.database();

    db.collection('wrong_questions')
      .where({
        _openid: '{openid}',
        mastered: false
      })
      .orderBy('createTime', 'desc')
      .limit(5)
      .get()
      .then(res => {
        const questions = res.data.map(q => ({
          id: q._id,
          question: q.question,
          typeName: this.getQuestionTypeName(q.type),
          time: this.formatTime(q.createTime)
        }));

        this.setData({
          recentWrongQuestions: questions
        });
      })
      .catch(err => {
        console.error('获取错题列表失败：', err);
      });
  },

  // 处理登录
  handleLogin: function () {
    wx.showLoading({ title: '登录中...' });

    app.login()
      .then(userInfo => {
        this.setData({
          isLoggedIn: true,
          userInfo,
          gradeText: userInfo.grade || '请选择年级'
        });
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败', icon: 'error' });
      });
  },

  // 处理菜单点击
  handleMenuTap: function (e) {
    const type = e.currentTarget.dataset.type;

    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再开始练习',
        confirmText: '去登录',
        success: res => {
          if (res.confirm) {
            this.handleLogin();
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/practice/practice?type=${type}`
    });
  },

  // 获取题目类型名称
  getQuestionTypeName: function (type) {
    const typeMap = {
      addition: '加法',
      subtraction: '减法',
      multiplication: '乘法',
      division: '除法',
      mixed: '混合运算'
    };
    return typeMap[type] || type;
  },

  // 格式化时间
  formatTime: function (date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return Math.floor(diff / 86400000) + '天前';
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.refreshStats();
    this.loadRecentWrongQuestions();
    wx.stopPullDownRefresh();
  }
});
