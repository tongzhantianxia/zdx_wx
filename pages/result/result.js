// pages/result/result.js
Page({
  data: {
    questionCount: 0,
    knowledgeName: '',
    encouragement: '',
    duckDelta: null,
    goldenDuckEarned: false,
    consecutivePerfect: 0
  },

  onLoad: function (options) {
    // 鼓励语列表
    const encouragements = [
      '坚持练习，进步看得见！',
      '很棒！熟能生巧！',
      '每天进步一点点！',
      '错题是进步的阶梯！',
      '继续加油！'
    ];

    // 从页面参数获取数据
    const questionCount = parseInt(options.count) || 5;
    const knowledgeName = options.name || '数学练习';

    // 随机选择鼓励语
    const randomIndex = Math.floor(Math.random() * encouragements.length);

    this.setData({
      questionCount,
      knowledgeName,
      encouragement: encouragements[randomIndex]
    });

    // 读取鸭子数据
    const app = getApp();
    const practice = app.globalData.currentPractice;
    if (practice) {
      // 错题列表（用于答题回顾）
      const wrongAnswers = (practice.answers || []).filter(a => !a.isCorrect);

      const duckData = practice.duckData || { total: 0, earned: 0 };
      const totalDucks = duckData.total || 0;
      const earned = practice.duckDelta?.earned || 0;
      const targetForGolden = 10;
      const isGolden = totalDucks >= targetForGolden;
      const remainForTarget = Math.max(0, targetForGolden - totalDucks);
      
      this.setData({
        wrongAnswers,
        duckDelta: practice.duckDelta || null,
        goldenDuckEarned: practice.goldenDuckEarned || false,
        consecutivePerfect: practice.consecutivePerfect || 0,
        totalDucks,
        duckPercent: Math.min(100, (totalDucks / targetForGolden) * 100),
        targetPercent: 100,
        isGoldenDuck: isGolden,
        remainForGolden: remainForTarget > 0 ? remainForTarget : 0
      });
      if (practice.goldenDuckEarned) {
        setTimeout(() => {
          const anim = this.selectComponent('#duckAnimResult');
          if (anim) anim.play('golden_hatch');
        }, 800);
      }
    }
  },

  // 继续练习这个知识点
  handleContinue: function () {
    wx.navigateBack({
      delta: 1
    });
  },

  // 换个知识点练习
  handleChange: function () {
    wx.switchTab({
      url: '/pages/practice-select/practice-select'
    });
  },

  // 分享
  onShareAppMessage: function () {
    return {
      title: '孩子在用的数学练习神器',
      path: '/pages/practice-select/practice-select',
      imageUrl: '/images/share.png'
    };
  }
});
