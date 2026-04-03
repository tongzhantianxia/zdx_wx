const app = getApp();

Page({
  data: {
    imagePath: '',
    analyzing: false,
    analysisResult: null,
    selectedPoints: {},
    hasSelected: false
  },

  chooseImage: function () {
    const self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        self.setData({
          imagePath: tempFilePath,
          analysisResult: null,
          selectedPoints: {},
          hasSelected: false
        });
      }
    });
  },

  analyzeImage: function () {
    if (!this.data.imagePath) return;

    this.setData({ analyzing: true });

    // TODO: Replace with real OCR cloud function call
    // Mock analysis result after delay
    const self = this;
    setTimeout(function () {
      self.setData({
        analyzing: false,
        analysisResult: [
          { id: 'g5u-3-2', name: '除数是小数的小数除法', grade: '五年级上册', knowledgeId: 'g5u-3-2' },
          { id: 'g5u-3-3', name: '商的近似数', grade: '五年级上册', knowledgeId: 'g5u-3-3' },
          { id: 'g5u-3-4', name: '循环小数', grade: '五年级上册', knowledgeId: 'g5u-3-4' }
        ]
      });
    }, 2000);
  },

  togglePoint: function (e) {
    const index = e.currentTarget.dataset.index;
    const key = 'selectedPoints.' + index;
    const current = this.data.selectedPoints[index] || false;
    this.setData({ [key]: !current });

    const points = this.data.selectedPoints;
    points[index] = !current;
    const hasAny = Object.values(points).some(function (v) { return v; });
    this.setData({ hasSelected: hasAny });
  },

  startPractice: function () {
    const result = this.data.analysisResult;
    const selected = this.data.selectedPoints;
    const chosen = [];
    for (var i = 0; i < result.length; i++) {
      if (selected[i]) chosen.push(result[i]);
    }

    if (chosen.length === 0) {
      wx.showToast({ title: '请先选择知识点', icon: 'none' });
      return;
    }

    // Use the first selected knowledge point to generate 3 questions
    const point = chosen[0];
    const questionMode = wx.getStorageSync('questionMode') || 'bank';
    const cloudFnName = questionMode === 'auto' ? 'generateQuestions' : 'getQuestions';

    wx.showLoading({ title: '正在生成题目...' });

    function buildSessionId() {
      var ts = Date.now();
      var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      var suffix = '';
      for (var j = 0; j < 6; j++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return 'sess_' + ts + '_' + suffix;
    }

    var sessionId = buildSessionId();
    var self = this;

    wx.cloud.callFunction({
      name: cloudFnName,
      data: {
        knowledgeId: point.knowledgeId,
        knowledgeName: point.name,
        grade: point.grade.replace(/[上下]册/, ''),
        count: 1,
        targetCount: 3,
        difficulty: 'medium',
        questionType: 'calculation',
        existingQuestions: [],
        sessionId: sessionId
      },
      success: function (res) {
        wx.hideLoading();
        var r = res.result;
        if (r && r.success && r.questions) {
          app.globalData.currentQuestions = {
            questions: r.questions,
            knowledge: { id: point.knowledgeId, name: point.name },
            meta: r.meta,
            generateParams: {
              knowledgeId: point.knowledgeId,
              knowledgeName: point.name,
              grade: point.grade.replace(/[上下]册/, ''),
              difficulty: 'medium',
              questionType: 'calculation',
              targetCount: 3,
              sessionId: sessionId
            }
          };
          wx.navigateTo({ url: '/pages/practice/practice?source=generated' });
        } else {
          wx.showToast({ title: r && r.error || '生成失败', icon: 'none' });
        }
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      }
    });
  }
});
