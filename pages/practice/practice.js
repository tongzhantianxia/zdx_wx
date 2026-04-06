// pages/practice/practice.js
const app = getApp();
const duckManager = require('../../utils/duckManager.js');

Page({
  data: {
    practiceType: 'random',  // 练习类型
    currentIndex: 0,         // 当前题目索引
    totalQuestions: 10,      // 总题数
    score: 0,                // 得分
    progressPercent: 0,      // 进度百分比
    questions: [],           // 题目列表
    currentQuestion: null,   // 当前题目
    userAnswer: '',          // 用户答案
    selectedOption: -1,      // 选择题选中项索引（-1=未选）
    showHint: false,         // 显示提示
    showFeedback: false,     // 显示反馈
    isCorrect: false,        // 是否正确
    feedbackType: '',        // 反馈类型
    answers: [],             // 答题记录
    waitingForNext: false,   // 渐进出题：等待下一题生成
    keyboardHeight: 0,       // 键盘高度
    scrollTarget: '',        // scroll-into-view 目标
    sessionDuckDelta: { hatched: 0, died: 0 },
    pendingFeedback: null
  },

  onLoad: function (options) {
    console.log('[practice] onLoad, source:', options.source, 'hasData:', !!app.globalData.currentQuestions);
    const type = options.type || 'random';
    this.setData({ practiceType: type });

    if (app.globalData.currentQuestions) {
      const data = app.globalData.currentQuestions;
      console.log('[practice] loadQuestionsFromData, questions:', data.questions && data.questions.length, 'hasParams:', !!data.generateParams);
      this.loadQuestionsFromData(data);
    } else if (options.data) {
      try {
        const data = JSON.parse(decodeURIComponent(options.data));
        this.loadQuestionsFromData(data);
      } catch (err) {
        console.error('解析题目数据失败:', err);
        wx.showToast({ title: '暂无题目', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } else {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }

    this.setData({ sessionDuckDelta: { hatched: 0, died: 0 } });
  },

  // 从全局数据或 URL 参数加载题目数据
  loadQuestionsFromData: function (data) {
    const { questions, knowledge, meta, generateParams } = data;

    if (meta && meta.pending) {
      this.initOcrPractice(data);
      return;
    }

    if (!questions || questions.length === 0) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const gp = generateParams;
    if (gp && gp.targetCount && gp.sessionId) {
      this.initProgressivePractice(data);
      return;
    }

    const formattedQuestions = questions.map((q) => this.formatSingleQuestion(q));

    this.setData({
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      currentQuestion: formattedQuestions[0],
      practiceType: meta?.questionType || 'calculation',
      knowledgeInfo: knowledge,
      meta: meta,
      progressPercent: (1 / formattedQuestions.length) * 100,
      waitingForNext: false
    });

    console.log('已加载题目:', formattedQuestions.length, '道');
    console.log('当前题目:', formattedQuestions[0]);
  },

  initOcrPractice: function (data) {
    const { knowledge, meta } = data;
    const { expectedCount, analyzedQuestions } = meta;

    this.ocrDestroyed = false;
    this.ocrAllQuestions = [];

    this.setData({
      questions: [],
      totalQuestions: expectedCount || 6,
      currentQuestion: null,
      practiceType: meta.questionType || 'calculation',
      knowledgeInfo: knowledge,
      meta: meta,
      progressPercent: 0,
      waitingForNext: true
    });

    console.log('[ocrPractice] 开始, 预计:', expectedCount);
    this.runOcrGenerate(analyzedQuestions || []);
  },

  runOcrGenerate: async function (analyzed) {
    const FIXED_COUNT = 4;

    if (!analyzed.length) {
      wx.showToast({ title: '无题目可生成', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    try {
      const genCalls = analyzed.map(q => {
        const gradeLabel = q.grade || '五年级';

        if (q.knowledgeId) {
          return wx.cloud.callFunction({
            name: 'generateQuestions',
            data: {
              knowledgeId: q.knowledgeId,
              knowledgeName: q.knowledgeName,
              grade: gradeLabel,
              count: FIXED_COUNT,
              difficulty: q.difficulty || 'medium',
              questionType: 'calculation',
              existingQuestions: []
            }
          }).then(res => res.result).catch(err => {
            console.error('[ocrPractice] generate error:', err);
            return { success: false };
          });
        }
        const hint = (q.content || '').slice(0, 80);
        return wx.cloud.callFunction({
          name: 'generateQuestions',
          data: {
            knowledgeName: (q.knowledgePoint || '数学题').slice(0, 50),
            grade: gradeLabel,
            count: FIXED_COUNT,
            difficulty: q.difficulty || 'medium',
            questionType: 'calculation',
            existingQuestions: [],
            prefetchHint: hint
          }
        }).then(res => res.result).catch(err => {
          console.error('[ocrPractice] generate error:', err);
          return { success: false };
        });
      });

      await this.settleProgressively(genCalls);

      if (this.ocrAllQuestions.length === 0) {
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }

    } catch (err) {
      console.error('[ocrPractice] pipeline error:', err);
      if (this.ocrAllQuestions.length === 0) {
        wx.showToast({ title: '加载失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }
  },

  settleProgressively: function (promises) {
    const self = this;
    return new Promise(resolve => {
      let done = 0;
      const total = promises.length;

      promises.forEach(p => {
        p.then(result => {
          if (self.ocrDestroyed) return;
          if (result && result.success && result.questions) {
            const newQs = result.questions.map(q => self.formatSingleQuestion(q));
            self.ocrAllQuestions.push(...newQs);
            self.appendOcrQuestions(newQs);
          }
        }).finally(() => {
          done++;
          if (done >= total) resolve();
        });
      });
    });
  },

  appendOcrQuestions: function (newQs) {
    const current = this.data.questions;
    const merged = current.concat(newQs);
    const updates = {
      questions: merged,
      totalQuestions: Math.max(this.data.totalQuestions, merged.length)
    };

    if (!this.data.currentQuestion && merged.length > 0) {
      updates.currentQuestion = merged[0];
      updates.currentIndex = 0;
      updates.waitingForNext = false;
      updates.progressPercent = (1 / updates.totalQuestions) * 100;
    }

    this.setData(updates);
    console.log('[ocrPractice] 已加载:', merged.length, '道');
  },

  normContentKey: function (s) {
    return String(s || '').replace(/\s/g, '').replace(/\d+\.?\d*/g, 'N');
  },

  formatSingleQuestion: function (q) {
    // Build unified chartData
    let chartData = q.chartData || null;

    // Legacy: convert diagram to chartData
    if (!chartData && q.diagram) {
      const d = q.diagram;
      if (d.type === 'geometry') {
        // Determine 2d vs 3d by checking shapes
        const has3d = (d.shapes || []).some(s => ['cuboid', 'cube', 'cylinder', 'cone', 'sphere'].includes(s.type));
        chartData = { chartType: has3d ? 'shape_3d' : 'shape_2d', data: d };
      } else if (d.type === 'fractionBar') {
        chartData = { chartType: 'fractionBar', data: { numerator: d.numerator, denominator: d.denominator } };
      } else if (d.type === 'countingBlocks') {
        chartData = { chartType: 'countingBlocks', data: { count: d.count, rows: d.rows, cols: d.cols } };
      }
    }

    // Legacy: convert numberLine to chartData
    if (!chartData && q.numberLine) {
      chartData = { chartType: 'numberLine', data: q.numberLine };
    }

    return {
      id: q.id || Date.now() + Math.random(),
      contentBlocks: q.contentBlocks || [{ type: 'text', value: String(q.content || q.question || '').trim() }],
      chartData: chartData,
      answer: String(q.answer || '').trim(),
      answerFormat: q.answerFormat || 'number',
      answerUnit: q.answerUnit || '',
      options: Array.isArray(q.options) && q.options.length >= 2 ? this.shuffleOptions(q.options) : null,
      type: q.type || '计算题',
      typeName: q.type || '计算题',
      difficulty: this.getDifficultyLevel(q.difficulty),
      difficultyText: q.difficulty || '中等',
      hint: q.tip || '',
      solutionBlocks: q.solutionBlocks || (q.solution ? [{ type: 'text', value: String(q.solution).trim() }] : null)
    };
  },

  initProgressivePractice: function (data) {
    const { questions, knowledge, meta, generateParams } = data;
    const raw = questions[0];

    if (!raw || (!raw.content && (!raw.contentBlocks || raw.contentBlocks.length === 0))) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.generateParams = generateParams;
    this.targetCount = generateParams.targetCount;
    this.generatedCount = 1;
    this.pendingRequests = 0;
    this.questionQueue = [];
    this.destroyed = false;
    this.consecutiveFailures = 0;
    const firstContent = raw.contentBlocks
      ? raw.contentBlocks.map(b => b.value || '').join('')
      : String(raw.content || '');
    this.allExistingContents = [firstContent];

    const first = this.formatSingleQuestion(raw);
    this.accumulatedQuestions = [first];

    console.log('[practice] initProgressive, first:', JSON.stringify(first).slice(0, 200));

    this.setData({
      questions: this.accumulatedQuestions,
      totalQuestions: this.targetCount,
      currentQuestion: first,
      practiceType: meta && meta.questionType || 'calculation',
      knowledgeInfo: knowledge,
      meta: meta,
      progressPercent: (1 / this.targetCount) * 100,
      waitingForNext: false
    });

    console.log('[practice] setData done, currentQuestion:', !!this.data.currentQuestion, 'waitingForNext:', this.data.waitingForNext);

    setTimeout(() => {
      if (!this.destroyed) {
        this.prefetchQuestions();
      }
    }, 0);
  },

  prefetchQuestions: function () {
    if (this.destroyed || !this.generateParams) return;

    const remaining = this.targetCount - this.generatedCount - this.pendingRequests;
    if (remaining <= 0) return;

    const buffer = this.questionQueue.length + this.pendingRequests;
    if (buffer >= 3) return;

    const needed = Math.max(0, Math.min(3 - buffer, remaining));
    if (needed <= 0) return;

    for (let i = 0; i < needed; i++) {
      this.pendingRequests += 1;
      const hint = `变式${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      this.callGenerateOne(hint);
    }
  },

  callGenerateOne: function (prefetchHint) {
    const gp = this.generateParams;
    if (!gp || this.destroyed) {
      this.pendingRequests = Math.max(0, this.pendingRequests - 1);
      return;
    }

    wx.cloud.callFunction({
      name: 'generateQuestions',
      data: {
        knowledgeId: gp.knowledgeId,
        knowledgeName: gp.knowledgeName,
        grade: gp.grade,
        count: 1,
        targetCount: gp.targetCount,
        difficulty: gp.difficulty,
        questionType: gp.questionType,
        existingQuestions: [...this.allExistingContents],
        sessionId: gp.sessionId,
        prefetchHint: prefetchHint
      },
      success: (res) => {
        const r = res && res.result ? res.result : { success: false, error: '无响应' };
        this.onPrefetchResult(r);
      },
      fail: (err) => {
        this.onPrefetchResult({
          success: false,
          error: (err && err.errMsg) || '网络错误'
        });
      }
    });
  },

  onPrefetchResult: function (result) {
    if (this.destroyed) {
      this.pendingRequests = Math.max(0, this.pendingRequests - 1);
      return;
    }

    this.pendingRequests = Math.max(0, this.pendingRequests - 1);

    const rateBlocked = result && result.code === 'RATE_LIMITED';

    if (result && result.success && result.questions && result.questions[0]) {
      const raw = result.questions[0];
      const rawContent = raw.content || (raw.contentBlocks ? raw.contentBlocks.map(b => b.value).join('') : '');
      const key = this.normContentKey(rawContent);
      const dup = this.allExistingContents.some(
        (ex) => this.normContentKey(ex) === key
      );

      if (dup) {
        this.prefetchQuestions();
        return;
      }

      this.allExistingContents.push(rawContent);
      this.generatedCount += 1;
      this.consecutiveFailures = 0;

      const formatted = this.formatSingleQuestion(raw);
      this.accumulatedQuestions.push(formatted);
      this.questionQueue.push(formatted);

      this.setData({
        questions: this.accumulatedQuestions
      });

      if (this.data.waitingForNext) {
        this.showNextFromQueue();
      }

      this.prefetchQuestions();
      return;
    }

    if (rateBlocked) {
      const self = this;
      setTimeout(function () {
        if (!self.destroyed) {
          self.prefetchQuestions();
        }
      }, 3000);
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures < 2) {
      this.prefetchQuestions();
      return;
    }

    wx.showToast({
      title: '部分题目生成失败',
      icon: 'none'
    });

    this.targetCount = this.generatedCount;
    this.setData({ totalQuestions: this.generatedCount });

    if (
      this.data.waitingForNext &&
      this.pendingRequests === 0 &&
      this.questionQueue.length === 0
    ) {
      this.goToResult();
    }
  },

  showNextFromQueue: function () {
    const next = this.questionQueue.shift();
    if (!next) return;

    const idx = this.data.waitingForNext
      ? this.data.currentIndex
      : this.data.currentIndex + 1;

    const total = this.data.totalQuestions;
    this.setData({
      currentQuestion: next,
      currentIndex: idx,
      progressPercent: total ? ((idx + 1) / total) * 100 : 0,
      waitingForNext: false
    });
  },

  // 获取难度等级
  getDifficultyLevel: function (difficultyText) {
    const map = {
      '简单': 1,
      'easy': 1,
      '中等': 2,
      'medium': 2,
      '困难': 3,
      'hard': 3
    };
    return map[difficultyText] || 2;
  },

  onOptionTap: function (e) {
    const idx = e.currentTarget.dataset.index;
    const option = this.data.currentQuestion.options[idx];
    this.setData({
      selectedOption: idx,
      userAnswer: option
    });
  },

  // 显示提示
  showHintTap: function () {
    this.setData({ showHint: true });
  },

  // 提交答案
  handleSubmit: function () {
    if (this.data.waitingForNext) return;
    if (!this.data.currentQuestion) return;
    if (this.data.showFeedback) return;

    const { currentQuestion, userAnswer, currentIndex } = this.data;

    if (!userAnswer) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    const isCorrect = this.checkAnswer(userAnswer, currentQuestion.answer);

    const answerRecord = {
      questionId: currentQuestion.id,
      contentBlocks: currentQuestion.contentBlocks,
      chartData: currentQuestion.chartData || null,
      correctAnswer: currentQuestion.answer,
      userAnswer,
      isCorrect,
      time: new Date()
    };

    // 鸭子动画逻辑：先算出动画类型，再决定是否延迟显示反馈
    let duckResult;
    if (isCorrect) {
      duckResult = duckManager.onCorrectAnswer();
      this.data.sessionDuckDelta.hatched += 1;
    } else {
      duckResult = duckManager.onWrongAnswer();
      if (duckResult.type !== 'none') {
        this.data.sessionDuckDelta.died += 1;
      }
    }

    const shouldPlayAnim = duckResult.type !== 'none';

    this.setData({
      showFeedback: !shouldPlayAnim,
      isCorrect,
      feedbackType: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? this.data.score + 10 : this.data.score,
      answers: [...this.data.answers, answerRecord]
    });

    if (shouldPlayAnim) {
      const anim = this.selectComponent('#duckAnim');
      if (anim) {
        anim.play(duckResult.type);
      } else {
        this.setData({ showFeedback: true });
      }
    }

    // 保存答题记录
    this.saveAnswerRecord(answerRecord);

    // 如果答错，加入错题库
    if (!isCorrect) {
      this.addToWrongQuestions(currentQuestion, userAnswer);
    }
  },

  checkAnswer: function (userAnswer, correctAnswer) {
    return userAnswer === correctAnswer;
  },

  shuffleOptions: function (options) {
    const arr = options.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  },

  handleNext: function () {
    const { currentIndex, totalQuestions } = this.data;

    this.setData({
      showFeedback: false,
      showHint: false,
      userAnswer: '',
      selectedOption: -1
    });

    const mathInput = this.selectComponent('#mathInput');
    if (mathInput) mathInput.reset();

    if (!this.generateParams) {
      this.setData({
        currentIndex: currentIndex + 1,
        progressPercent: ((currentIndex + 1) / totalQuestions) * 100
      });

      if (currentIndex + 1 >= totalQuestions) {
        this.goToResult();
      } else {
        this.setData({
          currentQuestion: this.data.questions[currentIndex + 1]
        });
      }
      return;
    }

    const nextIndex = currentIndex + 1;
    const done =
      nextIndex >= this.generatedCount &&
      this.pendingRequests === 0 &&
      this.questionQueue.length === 0;

    if (done) {
      this.goToResult();
      return;
    }

    if (this.questionQueue.length > 0) {
      this.showNextFromQueue();
      this.prefetchQuestions();
      return;
    }

    this.setData({
      waitingForNext: true,
      currentIndex: nextIndex,
      currentQuestion: null,
      progressPercent: totalQuestions
        ? ((nextIndex + 1) / totalQuestions) * 100
        : 0
    });
  },

  // 跳转结果页
  goToResult: function () {
    const { score, answers, totalQuestions, practiceType } = this.data;
    const correctCount = answers.filter(a => a.isCorrect).length;

    // Save question summaries to local storage for cross-session dedup
    if (this.generateParams && this.generateParams.knowledgeId) {
      const historyKey = 'qHistory_' + this.generateParams.knowledgeId;
      const existing = wx.getStorageSync(historyKey) || [];
      const newSummaries = (this.accumulatedQuestions || this.data.questions || [])
        .map(q => {
          const text = (q.contentBlocks || []).map(b => b.value || '').join('');
          return text.slice(0, 60);
        })
        .filter(Boolean);
      const merged = existing.concat(newSummaries);
      // Keep last 30 to avoid storage bloat
      wx.setStorageSync(historyKey, merged.slice(-30));
    }

    app.globalData.currentPractice = {
      score,
      correctCount,
      totalQuestions,
      accuracy: Math.round((correctCount / totalQuestions) * 100),
      answers,
      practiceType,
      finishTime: new Date(),
      duckDelta: this.data.sessionDuckDelta
    };

    // 鸭子连胜判定
    const allCorrect = correctCount === totalQuestions;
    const sessionResult = duckManager.onSessionEnd(allCorrect);
    app.globalData.currentPractice.goldenDuckEarned = sessionResult.goldenDuckEarned;
    app.globalData.currentPractice.consecutivePerfect = sessionResult.consecutivePerfect;

    wx.redirectTo({
      url: '/pages/result/result'
    });
  },

  // 保存答题记录
  saveAnswerRecord: function (record) {
    const db = wx.cloud.database();

    db.collection('practice_records').add({
      data: {
        ...record,
        createTime: db.serverDate()
      }
    }).catch(err => {
      console.error('保存答题记录失败：', err);
    });
  },

  addToWrongQuestions: function (question, wrongAnswer) {
    const db = wx.cloud.database();
    db.collection('wrong_questions')
      .where({ _openid: '{openid}', questionId: question.id })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          db.collection('wrong_questions')
            .doc(res.data[0]._id)
            .update({
              data: {
                wrongCount: db.command.inc(1),
                lastWrongAnswer: wrongAnswer,
                lastWrongTime: db.serverDate()
              }
            });
        } else {
          db.collection('wrong_questions').add({
            data: {
              questionId: question.id,
              contentBlocks: question.contentBlocks,
              chartData: question.chartData,
              answer: question.answer,
              answerFormat: question.answerFormat,
              answerUnit: question.answerUnit,
              solutionBlocks: question.solutionBlocks,
              type: question.type,
              wrongAnswer,
              wrongCount: 1,
              mastered: false,
              createTime: db.serverDate(),
              lastWrongTime: db.serverDate()
            }
          });
        }
      })
      .catch(err => { console.error('添加错题失败：', err); });
  },

  // 获取题型名称
  getTypeName: function (type) {
    const typeMap = {
      addition: '加法',
      subtraction: '减法',
      multiplication: '乘法',
      division: '除法',
      mixed: '混合运算'
    };
    return typeMap[type] || type;
  },

  // 获取难度文本
  getDifficultyText: function (difficulty) {
    const diffMap = {
      1: '简单',
      2: '中等',
      3: '困难'
    };
    return diffMap[difficulty] || '简单';
  },

  onDuckAnimDone: function () {
    this.setData({ showFeedback: true });
  },

  onUnload: function () {
    this.destroyed = true;
    this.ocrDestroyed = true;
    app.globalData.currentQuestions = null;
  }
});
