const katexMini = require('@rojer/katex-mini');

Component({
  properties: {
    blocks: {
      type: Array,
      value: []
    }
  },

  observers: {
    'blocks': function(blocks) {
      if (!blocks || !blocks.length) {
        this.setData({ parsedBlocks: [] });
        return;
      }
      const parsedBlocks = blocks.map(block => {
        if (block.type === 'latex') {
          try {
            const nodes = katexMini.parse(block.value);
            return { type: 'latex', nodes: nodes };
          } catch (e) {
            console.error('[math-text] LaTeX parse error:', e.message, block.value);
            return { type: 'text', value: block.value };
          }
        }
        return { type: 'text', value: block.value || '' };
      });
      this.setData({ parsedBlocks });
    }
  },

  data: {
    parsedBlocks: []
  }
});
