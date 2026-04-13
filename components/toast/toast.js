Component({
  data: {
    visible: false,
    message: ''
  },
  methods: {
    show(message) {
      this.setData({ visible: true, message })
      if (this._timer) clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        this.setData({ visible: false })
      }, 1500)
    }
  }
})
