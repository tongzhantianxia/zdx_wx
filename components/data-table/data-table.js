Component({
  properties: {
    data: { type: Object, value: null, observer: '_onDataChange' }
  },

  data: {
    tableData: null
  },

  lifetimes: {
    attached() { this._process(); }
  },

  methods: {
    _onDataChange() { this._process(); },

    _process() {
      const d = this.data.data;
      if (!d || !d.headers || !d.rows) {
        this.setData({ tableData: null });
        return;
      }
      this.setData({ tableData: d });
    }
  }
});
