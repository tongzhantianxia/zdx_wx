const app = getApp();

const DIFFICULTY_COUNT = { easy: 2, medium: 3, hard: 5 };

const GRADE_LIST = [
  { label: '1年级', value: 'grade1' },
  { label: '2年级', value: 'grade2' },
  { label: '3年级', value: 'grade3' },
  { label: '4年级', value: 'grade4' },
  { label: '5年级', value: 'grade5' },
  { label: '6年级', value: 'grade6' }
];

const GRADE_LABEL_MAP = {
  grade1: '一年级', grade2: '二年级', grade3: '三年级',
  grade4: '四年级', grade5: '五年级', grade6: '六年级'
};

Page({
  data: {
    statusBarHeight: getApp().globalData.statusBarHeight || wx.getSystemInfoSync().statusBarHeight,
    pageState: 'idle',
    imagePath: '',
    uploadProgress: 0,
    questions: [],
    selectedMap: {},
    selectedCount: 0,
    expandedIndex: -1,
    totalTrainingCount: 0,
    selectedGrade: 'grade5',
    selectedSemester: 'upper',
    gradeList: GRADE_LIST
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
  },

  handleGradeChange(e) {
    const grade = e.currentTarget.dataset.grade;
    if (grade === this.data.selectedGrade) return;
    this.setData({ selectedGrade: grade });
  },

  handleSemesterChange(e) {
    const semester = e.currentTarget.dataset.semester;
    if (semester === this.data.selectedSemester) return;
    this.setData({ selectedSemester: semester });
  },

  _gradeLabel() {
    return GRADE_LABEL_MAP[this.data.selectedGrade] || '五年级';
  },

  chooseImage() {
    const self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        self.setData({
          imagePath: tempFilePath,
          pageState: 'idle',
          questions: [],
          selectedMap: {},
          selectedCount: 0,
          expandedIndex: -1,
          totalTrainingCount: 0
        });
        self.uploadAndAnalyze(tempFilePath);
      }
    });
  },

  async uploadAndAnalyze(filePath) {
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

      this.setData({ pageState: 'analyzing' });

      const ocrRes = await wx.cloud.callFunction({
        name: 'ocrRecognize',
        data: {
          fileID: uploadRes.fileID,
          grade: this._gradeLabel(),
          semester: this.data.selectedSemester
        }
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
          icon: 'none',
          duration: 3000
        });
        this.setData({ pageState: 'idle' });
        return;
      }

      this.setData({
        pageState: 'result',
        questions: result.questions
      });

    } catch (err) {
      console.error('[improve] uploadAndAnalyze error:', err);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
      this.setData({ pageState: 'idle' });
    }
  },

  toggleQuestion(e) {
    const idx = e.currentTarget.dataset.index;
    const key = `selectedMap.${idx}`;
    const current = this.data.selectedMap[idx] || false;
    const newVal = !current;
    this.setData({ [key]: newVal });
    this.updateSelectedCount();
  },

  toggleFromImage(e) {
    const idx = e.currentTarget.dataset.index;
    const key = `selectedMap.${idx}`;
    const current = this.data.selectedMap[idx] || false;
    this.setData({ [key]: !current });
    this.updateSelectedCount();
  },

  expandQuestion(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({
      expandedIndex: this.data.expandedIndex === idx ? -1 : idx
    });
  },

  updateSelectedCount() {
    const map = this.data.selectedMap;
    const questions = this.data.questions;
    let count = 0;
    let trainingCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (map[i]) {
        count++;
        trainingCount += DIFFICULTY_COUNT[questions[i].difficulty] || 3;
      }
    }
    this.setData({ selectedCount: count, totalTrainingCount: trainingCount });
  },

  async startTraining() {
    const { questions, selectedMap } = this.data;
    const chosen = [];
    for (let i = 0; i < questions.length; i++) {
      if (selectedMap[i]) chosen.push(questions[i]);
    }

    if (chosen.length === 0) {
      wx.showToast({ title: '请先选择题目', icon: 'none' });
      return;
    }

    this.setData({ pageState: 'generating' });

    const groups = {};
    chosen.forEach(q => {
      const groupKey = q.knowledgeId || `unmatched_${q.knowledgePoint}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          knowledgeId: q.knowledgeId,
          knowledgeName: q.knowledgeName,
          knowledgePoint: q.knowledgePoint,
          totalCount: 0,
          contents: []
        };
      }
      groups[groupKey].totalCount += DIFFICULTY_COUNT[q.difficulty] || 3;
      groups[groupKey].contents.push(q.content);
    });

    const gradeLabel = this._gradeLabel();
    const questionMode = wx.getStorageSync('questionMode') || 'bank';
    const calls = [];

    Object.values(groups).forEach(group => {
      const batches = [];
      let remaining = group.totalCount;
      while (remaining > 0) {
        batches.push(Math.min(remaining, 10));
        remaining -= 10;
      }

      batches.forEach(batchCount => {
        if (group.knowledgeId) {
          const fnName = questionMode === 'auto' ? 'generateQuestions' : 'getQuestions';
          calls.push(
            wx.cloud.callFunction({
              name: fnName,
              data: {
                knowledgeId: group.knowledgeId,
                knowledgeName: group.knowledgeName,
                grade: gradeLabel,
                count: batchCount,
                difficulty: 'medium',
                questionType: 'calculation',
                existingQuestions: []
              }
            }).then(res => res.result).catch(err => {
              console.error('[improve] getQuestions error:', err);
              return { success: false, error: err.message };
            })
          );
        } else {
          const hint = (group.contents[0] || '').slice(0, 80);
          calls.push(
            wx.cloud.callFunction({
              name: 'generateQuestions',
              data: {
                knowledgeName: (group.knowledgePoint || '数学题').slice(0, 50),
                grade: gradeLabel,
                count: batchCount,
                difficulty: 'medium',
                questionType: 'calculation',
                existingQuestions: [],
                prefetchHint: hint
              }
            }).then(res => res.result).catch(err => {
              console.error('[improve] generateQuestions error:', err);
              return { success: false, error: err.message };
            })
          );
        }
      });
    });

    try {
      const results = await Promise.all(calls);
      const allQuestions = [];
      let failCount = 0;

      results.forEach(r => {
        if (r && r.success && r.questions) {
          allQuestions.push(...r.questions);
        } else {
          failCount++;
        }
      });

      if (allQuestions.length === 0) {
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        this.setData({ pageState: 'result' });
        return;
      }

      if (failCount > 0) {
        wx.showToast({ title: `${failCount}组题目生成失败，已跳过`, icon: 'none' });
      }

      app.globalData.currentQuestions = {
        questions: allQuestions,
        knowledge: { id: 'mixed', name: 'OCR加强训练' },
        meta: { questionType: 'calculation', origin: 'ocr_improve' }
      };

      wx.navigateTo({ url: '/pages/practice/practice?source=generated' });
      this.setData({ pageState: 'result' });

    } catch (err) {
      console.error('[improve] startTraining error:', err);
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
      this.setData({ pageState: 'result' });
    }
  },

  retakePhoto() {
    this.setData({
      pageState: 'idle',
      imagePath: '',
      questions: [],
      selectedMap: {},
      selectedCount: 0,
      expandedIndex: -1,
      totalTrainingCount: 0
    });
    this.chooseImage();
  }
});
