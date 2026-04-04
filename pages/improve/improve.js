const app = getApp();

const QUESTIONS_PER_ERROR = 4;
const RESET_STATE = {
  imagePath: '',
  questions: [],
  cloudFileID: '',
  totalCount: 0,
  improveCount: 0,
  activeTab: 0,
  currentDetail: null
};

Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    pageState: 'idle',
    ...RESET_STATE
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ ...RESET_STATE, imagePath: tempFilePath });
        this.uploadAndRecognize(tempFilePath);
      }
    });
  },

  async uploadAndRecognize(filePath) {
    this.setData({ pageState: 'uploading', uploadProgress: 0 });

    try {
      const timestamp = Date.now();
      const cloudPath = `ocr/${timestamp}_${Math.random().toString(36).slice(2, 8)}.jpg`;

      const uploadRes = await new Promise((resolve, reject) => {
        const task = wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: resolve,
          fail: reject
        });
        task.onProgressUpdate(res => {
          this.setData({ uploadProgress: res.progress });
        });
      });

      this.setData({ pageState: 'analyzing', cloudFileID: uploadRes.fileID });

      const ocrRes = await wx.cloud.callFunction({
        name: 'ocrRecognize',
        data: { fileID: uploadRes.fileID }
      });

      const result = ocrRes.result;

      if (result.code === 'RATE_LIMITED') {
        wx.showToast({ title: `操作太频繁，请${result.waitTime}秒后再试`, icon: 'none' });
        this.setData({ pageState: 'idle' });
        return;
      }

      if (!result.success || !result.questions || result.questions.length === 0) {
        wx.showToast({
          title: result.error || '未识别到题目，建议拍清晰一些',
          icon: 'none', duration: 3000
        });
        this.setData({ pageState: 'idle' });
        return;
      }

      const allQuestions = result.questions;
      const needImprove = allQuestions.filter(q => q.status !== 'correct');

      if (needImprove.length === 0) {
        wx.showToast({ title: '全部正确，无需提高', icon: 'none', duration: 2000 });
        this.setData({ pageState: 'idle' });
        return;
      }

      this.setData({
        pageState: 'result',
        questions: needImprove,
        totalCount: allQuestions.length,
        improveCount: needImprove.length,
        activeTab: 0,
        currentDetail: needImprove[0]
      });

    } catch (err) {
      console.error('[improve] uploadAndRecognize error:', err);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
      this.setData({ pageState: 'idle' });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab, currentDetail: this.data.questions[tab] });
  },

  startTraining() {
    const { questions, cloudFileID } = this.data;

    app.globalData.currentQuestions = {
      questions: [],
      knowledge: { id: 'mixed', name: '错题练习' },
      meta: {
        questionType: 'calculation',
        origin: 'ocr_improve',
        pending: true,
        cloudFileID,
        selectedIndices: questions.map(q => q.index),
        analyzedQuestions: questions,
        expectedCount: questions.length * QUESTIONS_PER_ERROR
      }
    };

    wx.navigateTo({ url: '/pages/practice/practice?source=generated' });
  },

  retakePhoto() {
    this.setData({ pageState: 'idle', ...RESET_STATE });
    this.chooseImage();
  }
});

