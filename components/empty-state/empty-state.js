// 空状态组件
Component({
  properties: {
    icon: {
      type: String,
      value: '📭'
    },
    text: {
      type: String,
      value: '暂无数据'
    },
    desc: {
      type: String,
      value: ''
    },
    btnText: {
      type: String,
      value: ''
    }
  },

  methods: {
    onEmptyAction: function () {
      this.triggerEvent('action');
    }
  }
});
