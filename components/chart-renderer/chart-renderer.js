const SUPPORTED_TYPES = [
  'bar', 'line', 'pie', 'clock', 'table',
  'shape_2d', 'shape_3d',
  'numberLine', 'fractionBar', 'countingBlocks',
  'grid', 'direction', 'transform', 'probability', 'measure'
];

Component({
  properties: {
    chartData: {
      type: Object,
      value: null,
      observer: '_onChartDataChange'
    }
  },

  data: {
    chartType: '',
    data: null,
    unsupported: false
  },

  methods: {
    _onChartDataChange(val) {
      if (!val || !val.chartType) {
        this.setData({ chartType: '', data: null, unsupported: false });
        return;
      }
      const supported = SUPPORTED_TYPES.includes(val.chartType);
      this.setData({
        chartType: supported ? val.chartType : '',
        data: val.data || null,
        unsupported: !supported
      });
    }
  }
});
