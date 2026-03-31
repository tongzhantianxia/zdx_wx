// pages/index/index.js
const app = getApp();
const { knowledgeData, getChapterList } = require('../../utils/knowledgeData');

Page({
  data: {
    // 学期选择
    selectedSemester: 'upper', // 'upper' 上册, 'lower' 下册

    // 知识点列表
    knowledgeList: [],

    // 选中的知识点
    selectedKnowledge: null,

    // 题目数量
    selectedCount: 3,

    // 难度选择
    selectedDifficulty: 'medium', // 'easy', 'medium', 'hard'

    // 生成状态
    generating: false
  },

  onLoad: function () {
    this.initKnowledgeList();
  },

  // 初始化知识点列表
  initKnowledgeList: function () {
    const semester = this.data.selectedSemester;
    const data = knowledgeData[semester];

    if (!data) {
      console.error('未找到学期数据:', semester);
      return;
    }

    // 转换数据格式，包含单元名
    const knowledgeList = data.chapters.map(chapter => ({
      id: chapter.id,
      unit: chapter.unit,
      name: chapter.name,
      knowledges: chapter.knowledges
    }));

    this.setData({ knowledgeList });
    console.log('知识点列表初始化完成，共', knowledgeList.length, '个单元');
  },

  // 切换学期
  handleSemesterChange: function (e) {
    const semester = e.currentTarget.dataset.semester;

    if (semester === this.data.selectedSemester) return;

    this.setData({
      selectedSemester: semester,
      selectedKnowledge: null // 清空已选知识点
    });

    this.initKnowledgeList();
    console.log('切换学期:', semester === 'upper' ? '上册' : '下册');
  },

  // 选择知识点
  handleKnowledgeSelect: function (e) {
    const item = e.currentTarget.dataset.item;
    const chapter = e.currentTarget.dataset.chapter;

    const selectedKnowledge = {
      id: item.id,
      name: item.name,
      unit: chapter.unit,
      unitName: chapter.name,
      semester: item.semester,
      difficulty_range: item.difficulty_range
    };

    this.setData({ selectedKnowledge });
    console.log('选择知识点:', selectedKnowledge.name);
  },

  // 切换题目数量
  handleCountChange: function (e) {
    const count = e.currentTarget.dataset.count;
    this.setData({ selectedCount: count });
    console.log('选择题目数量:', count);
  },

  // 切换难度
  handleDifficultyChange: function (e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    this.setData({ selectedDifficulty: difficulty });
    console.log('选择难度:', difficulty);
  },

  // 生成练习题
  handleGenerate: async function () {
    const { selectedKnowledge, selectedCount, selectedDifficulty } = this.data;

    // 参数校验
    if (!selectedKnowledge) {
      wx.showToast({
        title: '请先选择知识点',
        icon: 'none'
      });
      return;
    }

    // 显示加载状态
    this.setData({ generating: true });

    try {
      // 调用云函数生成题目
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

      console.log('云函数返回:', res);

      const result = res.result;

      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      // 生成成功，跳转到练习页
      app.globalData.currentQuestions = {
        questions: result.questions,
        knowledge: selectedKnowledge,
        meta: result.meta
      };

      wx.navigateTo({
        url: '/pages/practice/practice?source=generated'
      });

    } catch (error) {
      console.error('生成练习题失败:', error);
      wx.showModal({
        title: '生成失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ generating: false });
    }
  },

  // 分享
  onShareAppMessage: function () {
    return {
      title: '小学数学错题练习 - 针对薄弱知识点专项突破',
      path: '/pages/index/index'
    };
  }
});
