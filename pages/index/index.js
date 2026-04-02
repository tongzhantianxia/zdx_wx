// pages/index/index.js
const app = getApp();
const { knowledgeData } = require('../../utils/knowledgeData');

function buildSessionId() {
  const ts = Date.now();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `sess_${ts}_${suffix}`;
}

// 频率限制常量
const RATE_LIMIT_SECONDS = 10;
const RATE_LIMIT_KEY = 'lastGenerateTime';

Page({
  data: {
    statusBarHeight: 0,
    selectedGrade: 'grade5',
    gradeList: [
      { label: '1年级', value: 'grade1' },
      { label: '2年级', value: 'grade2' },
      { label: '3年级', value: 'grade3' },
      { label: '4年级', value: 'grade4' },
      { label: '5年级', value: 'grade5' },
      { label: '6年级', value: 'grade6' },
    ],
    selectedSemester: 'upper',
    knowledgeList: [],
    expandedChapter: null,
    selectedKnowledge: null,
    countList: [3, 5, 8, 10],
    selectedCount: 3,
    selectedDifficulty: 'medium',
    generating: false,
    countdown: 0
  },

  onLoad: function () {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });
    this.initKnowledgeList();
  },

  onShow: function () {
    this.checkRateLimit();
  },

  // 切换年级
  handleGradeChange: function (e) {
    const grade = e.currentTarget.dataset.grade;
    if (grade === this.data.selectedGrade) return;
    this.setData({ selectedGrade: grade, selectedKnowledge: null, expandedChapter: null });
    this.initKnowledgeList();
  },

  // 折叠面板切换
  handleChapterToggle: function (e) {
    const id = e.currentTarget.dataset.id;
    const current = this.data.expandedChapter;
    this.setData({ expandedChapter: current === id ? null : id });
  },

  // 初始化知识点列表
  initKnowledgeList: function () {
    const key = `${this.data.selectedGrade}-${this.data.selectedSemester}`;
    const data = knowledgeData[key];

    if (!data) return;

    const knowledgeList = data.chapters.map(chapter => ({
      id: chapter.id,
      unit: chapter.unit,
      name: chapter.name,
      knowledges: chapter.knowledges
    }));

    // 默认展开第一个章节
    const firstId = knowledgeList.length > 0 ? knowledgeList[0].id : null;
    this.setData({
      knowledgeList,
      expandedChapter: this.data.expandedChapter || firstId
    });
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
  _gradeLabel: function () {
    const map = { grade1: '一年级', grade2: '二年级', grade3: '三年级', grade4: '四年级', grade5: '五年级', grade6: '六年级' };
    return map[this.data.selectedGrade] || '五年级';
  },

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
      const sessionId = buildSessionId();
      const gradeLabel = this._gradeLabel();
      const res = await wx.cloud.callFunction({
        name: 'generateQuestions',
        data: {
          knowledgeId: selectedKnowledge.id,
          knowledgeName: selectedKnowledge.name,
          grade: gradeLabel,
          count: 1,
          targetCount: selectedCount,
          difficulty: selectedDifficulty,
          questionType: 'calculation',
          existingQuestions: [],
          sessionId
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
        meta: result.meta,
        generateParams: {
          knowledgeId: selectedKnowledge.id,
          knowledgeName: selectedKnowledge.name,
          grade: gradeLabel,
          difficulty: selectedDifficulty,
          questionType: 'calculation',
          targetCount: selectedCount,
          sessionId
        }
      };

      // 跳转练习页
      wx.navigateTo({
        url: '/pages/practice/practice?source=generated'
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
