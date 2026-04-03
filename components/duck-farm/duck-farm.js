Component({
  properties: {
    normalDucks: { type: Number, value: 0 },
    goldenDucks: { type: Number, value: 0 },
    swans: { type: Number, value: 0 }
  },

  observers: {
    'normalDucks, goldenDucks, swans': function (normal, golden, swans) {
      this.buildDuckList(normal, golden, swans);
    }
  },

  data: {
    ducks: [],
    totalCount: 0,
    canMergeGolden: false,
    canMergeSwan: false
  },

  lifetimes: {
    attached() {
      this.buildDuckList(this.properties.normalDucks, this.properties.goldenDucks, this.properties.swans);
    }
  },

  methods: {
    buildDuckList(normal, golden, swans) {
      const ducks = [];
      for (let i = 0; i < (swans || 0); i++) {
        ducks.push({ id: 's_' + i, type: 'swan', offsetX: this.pseudoRandom(i, 50), delay: i * 0.2 });
      }
      for (let i = 0; i < golden; i++) {
        ducks.push({ id: 'g_' + i, type: 'golden', offsetX: this.pseudoRandom(i + (swans || 0), 40), delay: (i + (swans || 0)) * 0.15 });
      }
      for (let i = 0; i < normal; i++) {
        ducks.push({ id: 'n_' + i, type: 'normal', offsetX: this.pseudoRandom(i + golden + (swans || 0), 40), delay: (i + golden + (swans || 0)) * 0.08 });
      }
      this.setData({
        ducks,
        totalCount: normal + golden + (swans || 0),
        canMergeGolden: normal >= 12,
        canMergeSwan: golden >= 10
      });
    },

    pseudoRandom(seed, range) {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return Math.floor((x - Math.floor(x)) * range) - range / 2;
    },

    onMergeGolden() {
      this.triggerEvent('merge', { type: 'golden' });
    },

    onMergeSwan() {
      this.triggerEvent('merge', { type: 'swan' });
    }
  }
});
