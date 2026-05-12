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
      this.stopRecording()
    }
    this.cleanupSpeechListeners()
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
      this.stopRecording()
      return
    }

    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record'] === false) {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中允许录音权限，才能使用语音输入',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting() }
          })
          return
        }
        wx.authorize({
          scope: 'scope.record',
          success: () => this.startRecording(),
          fail: () => {
            wx.showModal({
              title: '需要录音权限',
              content: '请在设置中允许录音权限，才能使用语音输入',
              confirmText: '去设置',
              success: (r) => { if (r.confirm) wx.openSetting() }
            })
          }
        })
      }
    })
  },

  startRecording() {
    if (typeof wx.startSpeechRecognition === 'function') {
      this.useSpeechAPI()
    } else {
      this.useRecorderFallback()
    }
  },

  useSpeechAPI() {
    const baseText = this.data.memory || ''

    wx.offSpeechRecognitionResult()
    wx.offSpeechRecognitionEnd()
    wx.offSpeechRecognitionError()

    wx.onSpeechRecognitionResult((res) => {
      if (res.result) {
        const append = baseText ? baseText + res.result : res.result
        this.setData({ memory: append })
      }
    })

    wx.onSpeechRecognitionEnd(() => {
      this.setData({ isRecording: false })
      this.cleanupSpeechListeners()
    })

    wx.onSpeechRecognitionError((err) => {
      console.error('语音识别错误:', err)
      this.setData({ isRecording: false })
      this.cleanupSpeechListeners()
      wx.showToast({ title: '识别失败，请重试', icon: 'none' })
    })

    wx.startSpeechRecognition({
      lang: 'zh_CN',
      duration: 30,
      success: () => {
        this.setData({ isRecording: true })
      },
      fail: (err) => {
        console.error('startSpeechRecognition fail:', err)
        this.cleanupSpeechListeners()
        this.useRecorderFallback()
      }
    })
  },

  useRecorderFallback() {
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager()
      this.recorderManager.onStop((res) => {
        this.setData({ isRecording: false })
        if (res.tempFilePath) {
          this.transcribeAudio(res.tempFilePath)
        }
      })
      this.recorderManager.onError((err) => {
        console.error('录音错误:', err)
        this.setData({ isRecording: false })
        wx.showToast({ title: '录音失败', icon: 'none' })
      })
    }

    this.recorderManager.start({
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
    this.setData({ isRecording: true })
    wx.showToast({ title: '开始录音，再按一次停止', icon: 'none' })
  },

  transcribeAudio(tempFilePath) {
    wx.showLoading({ title: '识别中...' })
    wx.cloud.callFunction({
      name: 'generateCard',
      data: {
        type: 'transcribe',
        fileID: tempFilePath
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result && res.result.text) {
        const base = this.data.memory || ''
        this.setData({ memory: base + res.result.text })
      } else {
        wx.showToast({ title: '未能识别语音', icon: 'none' })
      }
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '识别失败', icon: 'none' })
    })
  },

  stopRecording() {
    if (typeof wx.stopSpeechRecognition === 'function') {
      wx.stopSpeechRecognition({
        complete: () => this.setData({ isRecording: false })
      })
    }
    if (this.recorderManager) {
      this.recorderManager.stop()
    }
    this.setData({ isRecording: false })
  },

  cleanupSpeechListeners() {
    try {
      wx.offSpeechRecognitionResult()
      wx.offSpeechRecognitionEnd()
      wx.offSpeechRecognitionError()
    } catch (e) {}
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
