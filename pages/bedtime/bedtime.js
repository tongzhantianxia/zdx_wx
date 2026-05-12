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

  onUnload() {
    if (this.data.isRecording) {
      wx.stopSpeechRecognition()
    }
    wx.offSpeechRecognitionResult()
    wx.offSpeechRecognitionEnd()
    wx.offSpeechRecognitionError()
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
      wx.stopSpeechRecognition({
        success: () => {
          this.setData({ isRecording: false })
        }
      })
      return
    }

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.startRecognition()
      },
      fail: () => {
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中允许录音权限，才能使用语音输入',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          }
        })
      }
    })
  },

  startRecognition() {
    let finalText = this.data.memory || ''

    wx.onSpeechRecognitionResult((res) => {
      if (res.result) {
        this.setData({ memory: finalText + res.result })
      }
      if (res.isFinal) {
        finalText = this.data.memory
      }
    })

    wx.onSpeechRecognitionEnd(() => {
      this.setData({ isRecording: false })
      wx.offSpeechRecognitionResult()
      wx.offSpeechRecognitionEnd()
      wx.offSpeechRecognitionError()
    })

    wx.onSpeechRecognitionError((err) => {
      console.error('语音识别错误:', err)
      this.setData({ isRecording: false })
      wx.offSpeechRecognitionResult()
      wx.offSpeechRecognitionEnd()
      wx.offSpeechRecognitionError()
      if (err.errCode === 10002) {
        wx.showToast({ title: '未检测到语音', icon: 'none' })
      } else {
        wx.showToast({ title: '语音识别出错', icon: 'none' })
      }
    })

    wx.startSpeechRecognition({
      lang: 'zh_CN',
      duration: 30,
      success: () => {
        this.setData({ isRecording: true })
      },
      fail: (err) => {
        console.error('启动语音识别失败:', err)
        wx.showToast({ title: '语音识别不可用', icon: 'none' })
      }
    })
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
