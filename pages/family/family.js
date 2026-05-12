const app = getApp()

const MEMBERS = ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆']
const EXPERIENCES = ['小时候的一天', '第一次上学', '一次犯错', '一次勇敢', '一个好朋友', '一次过年']

Page({
  data: {
    statusBarHeight: 0,
    members: MEMBERS,
    experiences: EXPERIENCES,
    selectedMember: '',
    selectedExp: '',
    memory: '',
    isGenerating: false
  },

  onLoad() {
    const { statusBarHeight } = wx.getSystemInfoSync()
    this.setData({ statusBarHeight })
  },

  handleBack() {
    wx.navigateBack()
  },

  handleSelectMember(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      selectedMember: this.data.selectedMember === val ? '' : val
    })
  },

  handleSelectExp(e) {
    const val = e.currentTarget.dataset.value
    this.setData({
      selectedExp: this.data.selectedExp === val ? '' : val
    })
  },

  onMemoryInput(e) {
    this.setData({ memory: e.detail.value })
  },

  handleGenerate() {
    if (this.data.isGenerating) return
    if (!this.data.selectedMember) {
      wx.showToast({ title: '请选择讲谁的故事', icon: 'none' })
      return
    }
    if (!this.data.selectedExp) {
      wx.showToast({ title: '请选择经历类型', icon: 'none' })
      return
    }

    this.setData({ isGenerating: true })

    wx.cloud.callFunction({
      name: 'generateCard',
      data: {
        type: 'family',
        member: this.data.selectedMember,
        experience: this.data.selectedExp,
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
