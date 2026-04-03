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
        normal_hatch: 2200,
        normal_death: 2200,
        golden_hatch: 3700,
        golden_death: 3100,
        swan_death: 3100
      };

      const textDelays = {
        normal_hatch: 700,
        normal_death: 200,
        golden_hatch: 2200,
        golden_death: 400,
        swan_death: 400
      };

      setTimeout(() => {
        this.setData({ showText: true });
      }, textDelays[type] || 500);

      const duration = durations[type] || 1000;
      setTimeout(() => {
        this.setData({ visible: false, animationType: '', showText: false, phase: '' });
        this.triggerEvent('done', { type });
      }, duration);
    }
  }
});
