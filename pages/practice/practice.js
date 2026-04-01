// pages/practice/practice.js
const app = getApp();

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
    showHint: false,         // 显示提示
    showFeedback: false,     // 显示反馈
    isCorrect: false,        // 是否正确
    feedbackType: '',        // 反馈类型
    answers: [],             // 答题记录
    waitingForNext: false,   // 渐进出题：等待下一题生成
    keyboardHeight: 0,       // 键盘高度
    scrollTarget: ''         // scroll-into-view 目标
  },

  onLoad: function (options) {
    const type = options.type || 'random';
    const source = options.source || 'database';
    this.setData({ practiceType: type });

    // 如果是从生成的题目加载
    if (source === 'generated' && app.globalData.currentQuestions) {
      const data = app.globalData.currentQuestions;
      this.loadQuestionsFromData(data);
    } else if (options.data) {
      // 如果有通过 URL 参数传递的题目数据,直接使用
      try {
        const data = JSON.parse(decodeURIComponent(options.data));
        this.loadQuestionsFromData(data);
      } catch (err) {
        console.error('解析题目数据失败:', err);
        this.loadQuestions();
      }
    } else {
      // 否则从数据库加载题目
      this.loadQuestions();
    }
  },

  // 从全局数据或 URL 参数加载题目数据
  loadQuestionsFromData: function (data) {
    const { questions, knowledge, meta, generateParams } = data;

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

  normContentKey: function (s) {
    return String(s || '').replace(/\s/g, '');
  },

  formatSingleQuestion: function (q) {
    return {
      id: q.id || Date.now() + Math.random(),
      question: q.content,
      answer: q.answer,
      type: q.type || '计算题',
      typeName: q.type || '计算题',
      difficulty: this.getDifficultyLevel(q.difficulty),
      difficultyText: q.difficulty || '中等',
      hint: q.tip || '',
      explanation: q.solution || ''
    };
  },

  initProgressivePractice: function (data) {
    const { questions, knowledge, meta, generateParams } = data;
    const raw = questions[0];

    if (!raw || !raw.content) {
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
    this.allExistingContents = [String(raw.content)];

    const first = this.formatSingleQuestion(raw);
    this.accumulatedQuestions = [first];

    this.setData({
      questions: this.accumulatedQuestions,
      totalQuestions: this.targetCount,
      currentQuestion: first,
      practiceType: meta?.questionType || 'calculation',
      knowledgeInfo: knowledge,
      meta: meta,
      progressPercent: (1 / this.targetCount) * 100,
      waitingForNext: false
    });

    console.log('渐进练习，目标题数:', this.targetCount);

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
    if (buffer >= 2) return;

    const needed = Math.max(0, Math.min(2 - buffer, remaining));
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
      const rawContent = String(raw.content || '');
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

  // 加载题目
  loadQuestions: function () {
    wx.showLoading({ title: '加载中...' });

    const { practiceType } = this.data;
    const db = wx.cloud.database();

    let query = db.collection('questions');

    // 根据练习类型筛选题目
    switch (practiceType) {
      case 'wrong':
        // 错题练习：从错题库获取
        this.loadWrongQuestions();
        return;
      case 'special':
        // 专项训练：根据用户薄弱项筛选
        query = query.where({
          type: this.getWeakType()
        });
        break;
      case 'exam':
        // 模拟测试：按难度递增
        query = query.orderBy('difficulty', 'asc');
        break;
      default:
        // 随机练习
        query = query.orderBy('createTime', 'desc');
    }

    query
      .limit(this.data.totalQuestions)
      .get()
      .then(res => {
        wx.hideLoading();

        if (res.data.length === 0) {
          wx.showToast({ title: '暂无题目', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
          return;
        }

        const questions = this.processQuestions(res.data);
        this.setData({
          questions,
          totalQuestions: questions.length,
          currentQuestion: questions[0]
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载题目失败：', err);
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },

  // 加载错题
  loadWrongQuestions: function () {
    const db = wx.cloud.database();

    db.collection('wrong_questions')
      .where({
        _openid: '{openid}',
        mastered: false
      })
      .orderBy('wrongCount', 'desc')
      .limit(this.data.totalQuestions)
      .get()
      .then(res => {
        wx.hideLoading();

        if (res.data.length === 0) {
          wx.showModal({
            title: '提示',
            content: '恭喜你，暂无错题！',
            showCancel: false,
            success: () => wx.navigateBack()
          });
          return;
        }

        const questions = this.processQuestions(res.data);
        this.setData({
          questions,
          totalQuestions: questions.length,
          currentQuestion: questions[0]
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('加载错题失败：', err);
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },

  // 处理题目数据
  processQuestions: function (data) {
    return data.map(q => ({
      id: q._id,
      question: q.question,
      answer: q.answer,
      type: q.type,
      typeName: this.getTypeName(q.type),
      difficulty: q.difficulty || 1,
      difficultyText: this.getDifficultyText(q.difficulty),
      hint: q.hint,
      explanation: q.explanation,
      inputType: q.inputType || 'number'
    }));
  },

  // 处理答案输入
  handleAnswerInput: function (e) {
    this.setData({
      userAnswer: e.detail.value.trim()
    });
  },

  // 显示提示
  showHintTap: function () {
    this.setData({ showHint: true });
  },

  // 收起键盘
  hideKeyboard: function () {
    wx.hideKeyboard();
  },

  onInputFocus: function (e) {
    const height = e.detail.height || 0;
    this.setData({
      keyboardHeight: height,
      scrollTarget: 'answerArea'
    });
  },

  onInputBlur: function () {
    this.setData({
      keyboardHeight: 0,
      scrollTarget: ''
    });
  },

  // 提交答案
  handleSubmit: function () {
    if (this.data.waitingForNext) return;
    if (!this.data.currentQuestion) return;

    const { currentQuestion, userAnswer, currentIndex } = this.data;

    if (!userAnswer) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    // 判断答案是否正确
    const isCorrect = this.checkAnswer(userAnswer, currentQuestion.answer);

    // 记录答题
    const answerRecord = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      correctAnswer: currentQuestion.answer,
      userAnswer,
      isCorrect,
      time: new Date()
    };

    this.setData({
      showFeedback: true,
      isCorrect,
      feedbackType: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? this.data.score + 10 : this.data.score,
      answers: [...this.data.answers, answerRecord]
    });

    // 保存答题记录
    this.saveAnswerRecord(answerRecord);

    // 如果答错，加入错题库
    if (!isCorrect) {
      this.addToWrongQuestions(currentQuestion, userAnswer);
    }
  },

  // 检查答案
  checkAnswer: function (userAnswer, correctAnswer) {
    // 数字类型答案，支持多种写法
    const userNum = parseFloat(userAnswer);
    const correctNum = parseFloat(correctAnswer);

    if (!isNaN(userNum) && !isNaN(correctNum)) {
      // 允许小数点误差
      return Math.abs(userNum - correctNum) < 0.0001;
    }

    // 字符串类型答案，忽略大小写和空格
    return userAnswer.toLowerCase().replace(/\s/g, '') ===
           correctAnswer.toLowerCase().replace(/\s/g, '');
  },

  // 下一题
  handleNext: function () {
    const { currentIndex, totalQuestions } = this.data;

    this.setData({
      showFeedback: false,
      showHint: false,
      userAnswer: ''
    });

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

    app.globalData.currentPractice = {
      score,
      correctCount,
      totalQuestions,
      accuracy: Math.round((correctCount / totalQuestions) * 100),
      answers,
      practiceType,
      finishTime: new Date()
    };

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

  // 加入错题库
  addToWrongQuestions: function (question, wrongAnswer) {
    const db = wx.cloud.database();

    // 先检查是否已存在
    db.collection('wrong_questions')
      .where({
        _openid: '{openid}',
        questionId: question.id
      })
      .get()
      .then(res => {
        if (res.data.length > 0) {
          // 更新错误次数
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
          // 新增错题
          db.collection('wrong_questions').add({
            data: {
              questionId: question.id,
              question: question.question,
              answer: question.answer,
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
      .catch(err => {
        console.error('添加错题失败：', err);
      });
  },

  // 获取薄弱题型
  getWeakType: function () {
    const stats = app.globalData.wrongTypeStats || {};
    let maxCount = 0;
    let weakType = 'addition';

    Object.keys(stats).forEach(type => {
      if (stats[type] > maxCount) {
        maxCount = stats[type];
        weakType = type;
      }
    });

    return weakType;
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

  onUnload: function () {
    this.destroyed = true;
    app.globalData.currentQuestions = null;
  }
});
