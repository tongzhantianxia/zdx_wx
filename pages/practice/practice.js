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
    answers: []              // 答题记录
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
    const { questions, knowledge, meta } = data;

    if (!questions || questions.length === 0) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 转换题目格式
    const formattedQuestions = questions.map(q => ({
      id: q.id || Date.now() + Math.random(),
      question: q.content,
      answer: q.answer,
      type: q.type || '计算题',
      typeName: q.type || '计算题',
      difficulty: this.getDifficultyLevel(q.difficulty),
      difficultyText: q.difficulty || '中等',
      hint: q.tip || '',
      explanation: q.solution || ''
    }));

    this.setData({
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      currentQuestion: formattedQuestions[0],
      practiceType: meta?.questionType || 'calculation',
      knowledgeInfo: knowledge,
      meta: meta,
      progressPercent: (1 / formattedQuestions.length) * 100
    });

    console.log('已加载题目:', formattedQuestions.length, '道');
    console.log('当前题目:', formattedQuestions[0]);
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

  // 提交答案
  handleSubmit: function () {
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
      userAnswer: '',
      currentIndex: currentIndex + 1,
      progressPercent: ((currentIndex + 1) / totalQuestions) * 100
    });

    if (currentIndex + 1 >= totalQuestions) {
      // 练习结束，跳转结果页
      this.goToResult();
    } else {
      // 显示下一题
      this.setData({
        currentQuestion: this.data.questions[currentIndex + 1]
      });
    }
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

  // 返回确认
  onUnload: function () {
    if (this.data.currentIndex > 0 && !this.data.showFeedback) {
      // 中途退出，提示确认
      // 注意：小程序不支持同步确认，这里仅作示意
    }
  }
});
