const app = getApp()

const TASKS = [
  '采访爸爸妈妈小时候',
  '听长辈讲过去的生活',
  '家里的老物件',
  '我的家庭故事'
]

Page({
  data: {
    statusBarHeight: 0,
    tasks: TASKS,
    selectedTask: '',
    isGenerating: false
  },

  onLoad() {
    const { statusBarHeight } = wx.getSystemInfoSync()
    this.setData({ statusBarHeight })
  },

  handleBack() {
    wx.navigateBack()
  },

  handleSelectTask(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      selectedTask: this.data.selectedTask === val ? '' : val
    })
  },

  handleGenerate() {
    if (this.data.isGenerating) return
    if (!this.data.selectedTask) {
      wx.showToast({ title: '请选择作业类型', icon: 'none' })
      return
    }

    this.setData({ isGenerating: true })

    wx.cloud.callFunction({
      name: 'generateCard',
      data: {
        type: 'homework',
        task: this.data.selectedTask
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
