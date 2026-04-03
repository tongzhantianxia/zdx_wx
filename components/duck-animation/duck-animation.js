Component({
  data: {
    visible: false,
    animationType: '',
    showText: false,
    phase: ''
  },

  methods: {
    play(type) {
      this.setData({
        visible: true,
        animationType: type,
        showText: false,
        phase: 'start'
      });

      const durations = {
        normal_hatch: 1000,
        normal_death: 1000,
        golden_hatch: 2700,
        golden_death: 1900
      };

      if (type === 'golden_hatch') {
        setTimeout(() => {
          this.setData({ showText: true });
        }, 2200);
      }

      const duration = durations[type] || 1000;
      setTimeout(() => {
        this.setData({ visible: false, animationType: '', showText: false, phase: '' });
        this.triggerEvent('done', { type });
      }, duration);
    }
  }
});
