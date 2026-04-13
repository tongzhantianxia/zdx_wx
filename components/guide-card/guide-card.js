const clipboard = require('../../utils/clipboard')

Component({
  properties: {
    type: { type: String, value: 'math' },
    title: { type: String, value: '' },
    tips: { type: Array, value: [] },
    loading: { type: Boolean, value: false },
    error: { type: Boolean, value: false }
  },

  methods: {
    onRefresh() {
      this.triggerEvent('refresh')
    },

    onCopy(e) {
      const { text } = e.currentTarget.dataset
      clipboard.copyText(text).then(() => {
        this.triggerEvent('toast', { message: '复制成功' })
      }).catch(() => {
        this.triggerEvent('toast', { message: '复制失败，请重试' })
      })
    },

    onCopyAll() {
      const allText = this.properties.tips.map((t, i) => `${i + 1}. ${t.text}`).join('\n')
      clipboard.copyText(allText).then(() => {
        this.triggerEvent('toast', { message: '复制成功' })
      }).catch(() => {
        this.triggerEvent('toast', { message: '复制失败，请重试' })
      })
    },

    onToggleFav(e) {
      const { id, text } = e.currentTarget.dataset
      this.triggerEvent('togglefav', { id, text, type: this.properties.type })
    }
  }
})
