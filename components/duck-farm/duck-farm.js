Component({
  properties: {
    normalDucks: { type: Number, value: 0 },
    goldenDucks: { type: Number, value: 0 }
  },

  observers: {
    'normalDucks, goldenDucks': function (normal, golden) {
      this.buildDuckList(normal, golden);
    }
  },

  data: {
    ducks: [],
    totalCount: 0
  },

  lifetimes: {
    attached() {
      this.buildDuckList(this.data.normalDucks, this.data.goldenDucks);
    }
  },

  methods: {
    buildDuckList(normal, golden) {
      const ducks = [];
      for (let i = 0; i < golden; i++) {
        ducks.push({ id: 'g_' + i, type: 'golden', offsetX: this.pseudoRandom(i, 40), delay: i * 0.15 });
      }
      for (let i = 0; i < normal; i++) {
        ducks.push({ id: 'n_' + i, type: 'normal', offsetX: this.pseudoRandom(i + golden, 40), delay: (i + golden) * 0.08 });
      }
      this.setData({ ducks, totalCount: normal + golden });
    },

    pseudoRandom(seed, range) {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return Math.floor((x - Math.floor(x)) * range) - range / 2;
    }
  }
});
