const app = getApp()

const PROBLEMS = [
  '不想写作业',
  '总想玩手机',
  '和好朋友吵架了',
  '害怕明天的考试',
  '晚上不愿睡觉'
]

const TONES = ['温柔共情', '轻松幽默', '鼓励行动']

Page({
  data: {
    statusBarHeight: 0,
    problems: PROBLEMS,
    tones: TONES,
    selectedProblem: '',
    selectedTone: '',
    isGenerating: false
  },

  onLoad() {
    const { statusBarHeight } = wx.getSystemInfoSync()
    this.setData({ statusBarHeight })
  },

  handleBack() {
    wx.navigateBack()
  },

  handleSelectProblem(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      selectedProblem: this.data.selectedProblem === val ? '' : val
    })
  },

  handleSelectTone(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      selectedTone: this.data.selectedTone === val ? '' : val
    })
  },

  handleGenerate() {
    if (this.data.isGenerating) return
    if (!this.data.selectedProblem) {
      wx.showToast({ title: '请选择一个问题', icon: 'none' })
      return
    }
    if (!this.data.selectedTone) {
      wx.showToast({ title: '请选择沟通语气', icon: 'none' })
      return
    }

    this.setData({ isGenerating: true })

    wx.cloud.callFunction({
      name: 'generateCard',
      data: {
        type: 'problem',
        problem: this.data.selectedProblem,
        tone: this.data.selectedTone
      }
    }).then(res => {
      if (res.result.success) {
        app.setCurrentResult(res.result.data)
        app.incrementGenerateCount()
        wx.navigateTo({ url: '/pages/result/result' })
      } else {
        wx.showToast({ title: res.result.error || '生成失败', icon: 'none' })
      }
    }).catch(() => {
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    }).finally(() => {
      this.setData({ isGenerating: false })
    })
  }
})
