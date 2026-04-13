Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },
  methods: {
    onClose() {
      this.triggerEvent('close')
    },
    preventTap() {}
  }
})
