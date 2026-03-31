// pages/index/index.js
const app = getApp();
const { knowledgeData } = require('../../utils/knowledgeData');

// 频率限制常量
const RATE_LIMIT_SECONDS = 10;
const RATE_LIMIT_KEY = 'lastGenerateTime';

Page({
  data: {
    selectedSemester: 'upper',
    knowledgeList: [],
    selectedKnowledge: null,
    selectedCount: 5,
    selectedDifficulty: 'medium',
    generating: false,
    countdown: 0  // 倒计时显示
  },

  onLoad: function () {
    this.initKnowledgeList();
  },

  onShow: function () {
    // 检查是否有倒计时需要恢复
    this.checkRateLimit();
  },

  // 初始化知识点列表
  initKnowledgeList: function () {
    const semester = this.data.selectedSemester;
    const data = knowledgeData[semester];

    if (!data) return;

    const knowledgeList = data.chapters.map(chapter => ({
      id: chapter.id,
      unit: chapter.unit,
      name: chapter.name,
      knowledges: chapter.knowledges
    }));

    this.setData({ knowledgeList });
  },

  // 切换学期
  handleSemesterChange: function (e) {
    const semester = e.currentTarget.dataset.semester;
    if (semester === this.data.selectedSemester) return;

    this.setData({
      selectedSemester: semester,
      selectedKnowledge: null
    });
    this.initKnowledgeList();
  },

  // 选择知识点
  handleKnowledgeSelect: function (e) {
    const item = e.currentTarget.dataset.item;
    const chapter = e.currentTarget.dataset.chapter;

    this.setData({
      selectedKnowledge: {
        id: item.id,
        name: item.name,
        unit: chapter.unit,
        unitName: chapter.name
      }
    });
  },

  // 切换题目数量
  handleCountChange: function (e) {
    this.setData({ selectedCount: e.currentTarget.dataset.count });
  },

  // 切换难度
  handleDifficultyChange: function (e) {
    this.setData({ selectedDifficulty: e.currentTarget.dataset.difficulty });
  },

  // 检查频率限制
  checkRateLimit: function () {
    const lastTime = wx.getStorageSync(RATE_LIMIT_KEY);
    if (!lastTime) return false;

    const elapsed = (Date.now() - lastTime) / 1000;
    if (elapsed < RATE_LIMIT_SECONDS) {
      const remaining = Math.ceil(RATE_LIMIT_SECONDS - elapsed);
      this.startCountdown(remaining);
      return true;
    }
    return false;
  },

  // 开始倒计时
  startCountdown: function (seconds) {
    this.setData({ countdown: seconds });

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.countdownTimer = setInterval(() => {
      const newCount = this.data.countdown - 1;
      if (newCount <= 0) {
        clearInterval(this.countdownTimer);
        this.setData({ countdown: 0 });
      } else {
        this.setData({ countdown: newCount });
      }
    }, 1000);
  },

  // 生成练习题
  handleGenerate: async function () {
    const { selectedKnowledge, selectedCount, selectedDifficulty, generating, countdown } = this.data;

    // 防止重复点击
    if (generating) return;

    // 检查倒计时
    if (countdown > 0) {
      wx.showToast({
        title: `请等待 ${countdown} 秒`,
        icon: 'none'
      });
      return;
    }

    // 参数校验
    if (!selectedKnowledge) {
      wx.showToast({ title: '请先选择知识点', icon: 'none' });
      return;
    }

    // 记录调用时间
    wx.setStorageSync(RATE_LIMIT_KEY, Date.now());

    // 显示加载状态
    this.setData({ generating: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'generateQuestions',
        data: {
          knowledgeId: selectedKnowledge.id,
          knowledgeName: selectedKnowledge.name,
          grade: '五年级',
          count: selectedCount,
          difficulty: selectedDifficulty,
          questionType: 'calculation'
        }
      });

      const result = res.result;

      // 处理频率限制错误
      if (result.code === 'RATE_LIMITED') {
        const waitTime = result.waitTime || RATE_LIMIT_SECONDS;
        this.startCountdown(waitTime);
        wx.showToast({
          title: `请等待 ${waitTime} 秒`,
          icon: 'none'
        });
        return;
      }

      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      // 保存到全局数据
      app.globalData.currentQuestions = {
        questions: result.questions,
        knowledge: selectedKnowledge,
        meta: result.meta
      };

      // 跳转练习页
      wx.navigateTo({
        url: '/pages/practice/practice'
      });

    } catch (error) {
      console.error('生成失败:', error);
      wx.showModal({
        title: '生成失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });

      // 出错时清除限制
      wx.removeStorageSync(RATE_LIMIT_KEY);
      this.setData({ countdown: 0 });

    } finally {
      this.setData({ generating: false });
    }
  },

  onUnload: function () {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  onShareAppMessage: function () {
    return {
      title: '小学数学错题练习',
      path: '/pages/index/index'
    };
  }
});
