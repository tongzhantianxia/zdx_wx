Component({
  properties: {
    format: {
      type: String,
      value: 'number'
    },
    unit: {
      type: String,
      value: ''
    }
  },

  data: {
    numberValue: '',
    numerator: '',
    denominator: '',
    textValue: ''
  },

  methods: {
    onNumberInput(e) {
      const val = e.detail.value.trim();
      this.setData({ numberValue: val });
      this.emitAnswer(val);
    },

    onNumeratorInput(e) {
      const val = e.detail.value.trim();
      this.setData({ numerator: val });
      this.emitFractionAnswer();
    },

    onDenominatorInput(e) {
      const val = e.detail.value.trim();
      this.setData({ denominator: val });
      this.emitFractionAnswer();
    },

    onTextInput(e) {
      const val = e.detail.value.trim();
      this.setData({ textValue: val });
      this.emitAnswer(val);
    },

    emitFractionAnswer() {
      const { numerator, denominator } = this.data;
      if (numerator && denominator) {
        this.emitAnswer(numerator + '/' + denominator);
      } else {
        this.emitAnswer('');
      }
    },

    emitAnswer(value) {
      this.triggerEvent('answer', { value });
    },

    reset() {
      this.setData({
        numberValue: '',
        numerator: '',
        denominator: '',
        textValue: ''
      });
    }
  }
});
