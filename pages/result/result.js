// pages/result/result.js
const app = getApp();

Page({
  data: {
    practiceResult: {
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
      accuracy: 0,
      answers: [],
      practiceType: '',
      finishTime: null
    },
    wrongAnswers: [],
    comment: '',
    accuracyLevel: ''
  },

  onLoad: function () {
    this.initResult();
  },

  // 初始化结果
  initResult: function () {
    const practiceResult = app.globalData.currentPractice || {
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
      accuracy: 0,
      answers: [],
      practiceType: 'random'
    };

    // 提取错题
    const wrongAnswers = practiceResult.answers
      .filter(a => !a.isCorrect)
      .map(a => ({
        ...a,
        timeText: this.formatTime(a.time)
      }));

    // 生成评语
    const comment = this.generateComment(practiceResult.accuracy);

    // 确定等级
    const accuracyLevel = this.getAccuracyLevel(practiceResult.accuracy);

    this.setData({
      practiceResult,
      wrongAnswers,
      comment,
      accuracyLevel
    });

    // 保存练习记录到云端
    this.savePracticeRecord(practiceResult);

    // 清空全局数据
    app.globalData.currentPractice = null;
  },

  // 生成评语
  generateComment: function (accuracy) {
    if (accuracy >= 90) {
      return '太棒了！你掌握得非常好，继续保持！';
    } else if (accuracy >= 80) {
      return '做得不错！再努力一点就能更完美！';
    } else if (accuracy >= 60) {
      return '还需要多加练习，相信你能做得更好！';
    } else if (accuracy >= 40) {
      return '别灰心，多多练习错题，你一定能进步！';
    } else {
      return '这次不太理想，建议多复习基础知识点哦！';
    }
  },

  // 获取正确率等级
  getAccuracyLevel: function (accuracy) {
    if (accuracy >= 90) return 'excellent';
    if (accuracy >= 70) return 'good';
    if (accuracy >= 50) return 'normal';
    return 'poor';
  },

  // 保存练习记录
  savePracticeRecord: function (result) {
    const db = wx.cloud.database();

    db.collection('practice_sessions').add({
      data: {
        score: result.score,
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        accuracy: result.accuracy,
        practiceType: result.practiceType,
        answers: result.answers,
        finishTime: db.serverDate(),
        createTime: db.serverDate()
      }
    }).then(() => {
      console.log('练习记录保存成功');
    }).catch(err => {
      console.error('保存练习记录失败：', err);
    });
  },

  // 再练一次
  handleRetry: function () {
    const { practiceType } = this.data.practiceResult;
    wx.redirectTo({
      url: `/pages/practice/practice?type=${practiceType}`
    });
  },

  // 返回首页
  handleGoHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 收藏错题
  handleReview: function (e) {
    const questionId = e.currentTarget.dataset.id;
    const db = wx.cloud.database();

    db.collection('wrong_questions')
      .doc(questionId)
      .update({
        data: {
          bookmarked: true
        }
      })
      .then(() => {
        wx.showToast({ title: '已收藏', icon: 'success' });
      })
      .catch(err => {
        console.error('收藏失败：', err);
        wx.showToast({ title: '收藏失败', icon: 'error' });
      });
  },

  // 格式化时间
  formatTime: function (date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 分享
  onShareAppMessage: function () {
    const { accuracy, score } = this.data.practiceResult;
    return {
      title: `我在数学错题练习中获得了${score}分，正确率${accuracy}%！`,
      path: '/pages/index/index'
    };
  }
});
