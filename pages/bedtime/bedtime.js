const app = getApp()
const storage = require('../../utils/storage')

const TOPICS = [
  '没有手机的一天',
  '小卖部门口的一瓶汽水',
  '爸爸妈妈小时候也怕黑',
  '第一次上学前的晚上',
  '外婆家夏天的夜晚',
  '那些年追过的动画片',
  '用零花钱买的最开心的东西'
]

const AGES = ['3-5岁', '6-8岁', '9-10岁']
const NARRATORS = ['妈妈', '爸爸', '外婆', '外公', '奶奶', '爷爷']

Page({
  data: {
    statusBarHeight: 0,
    topics: TOPICS,
    ages: AGES,
    narrators: NARRATORS,
    topicIndex: 0,
    selectedTopic: TOPICS[0],
    selectedAge: '3-5岁',
    selectedNarrator: '妈妈',
    memory: '',
    isGenerating: false,
    isRecording: false
  },

  onLoad() {
    const { statusBarHeight } = wx.getSystemInfoSync()
    const savedAge = storage.getLastAge()
    const savedNarrator = storage.getLastNarrator()
    const randomIndex = Math.floor(Math.random() * TOPICS.length)

    this.setData({
      statusBarHeight,
      selectedAge: savedAge,
      selectedNarrator: savedNarrator,
      topicIndex: randomIndex,
      selectedTopic: TOPICS[randomIndex]
    })
  },

  handleBack() {
    wx.navigateBack()
  },

  handleNextTopic() {
    const nextIndex = (this.data.topicIndex + 1) % TOPICS.length
    this.setData({
      topicIndex: nextIndex,
      selectedTopic: TOPICS[nextIndex]
    })
  },

  handleSelectAge(e) {
    const age = e.currentTarget.dataset.value
    this.setData({ selectedAge: age })
    storage.setLastAge(age)
  },

  handleSelectNarrator(e) {
    const narrator = e.currentTarget.dataset.value
    this.setData({ selectedNarrator: narrator })
    storage.setLastNarrator(narrator)
  },

  handleMemoryInput(e) {
    this.setData({ memory: e.detail.value })
  },

  handleToggleRecording() {
    if (this.data.isRecording) {
      this.setData({ isRecording: false })
      wx.showToast({ title: '录音已停止', icon: 'none' })
    } else {
      this.setData({ isRecording: true })
      wx.showToast({ title: '录音功能仅供展示', icon: 'none' })
      setTimeout(() => {
        if (this.data.isRecording) {
          this.setData({ isRecording: false })
        }
      }, 5000)
    }
  },

  handleGenerate() {
    if (this.data.isGenerating) return
    this.setData({ isGenerating: true })

    wx.cloud.callFunction({
      name: 'generateCard',
      data: {
        type: 'bedtime',
        topic: this.data.selectedTopic,
        age: this.data.selectedAge,
        narrator: this.data.selectedNarrator,
        memory: this.data.memory
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
