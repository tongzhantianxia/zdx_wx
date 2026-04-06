function latexToText(latex) {
  if (!latex) return '';
  let s = latex;
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
  s = s.replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt\[(\d+)\]\{([^{}]+)\}/g, '$1√($2)');
  s = s.replace(/\^{([^{}]+)}/g, '^$1');
  s = s.replace(/_{([^{}]+)}/g, '_$1');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\div/g, '÷');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\mp/g, '∓');
  s = s.replace(/\\leq/g, '≤');
  s = s.replace(/\\geq/g, '≥');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\angle/g, '∠');
  s = s.replace(/\\triangle/g, '△');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\degree/g, '°');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\text\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\quad/g, '  ');
  s = s.replace(/\\qquad/g, '    ');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\;/g, ' ');
  s = s.replace(/\\\\/g, '\n');
  s = s.replace(/\\begin\{[^{}]*\}/g, '');
  s = s.replace(/\\end\{[^{}]*\}/g, '');
  s = s.replace(/&/g, ' ');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/ {2,}/g, ' ');
  return s.trim();
}

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
      const result = [];
      for (const block of blocks) {
        if (block.type === 'latex') {
          result.push({ type: 'text', value: latexToText(block.value) });
        } else {
          // Parse inline $...$ LaTeX within text blocks
          const text = block.value || '';
          const parts = text.split(/(\$[^$]+\$)/g);
          let combined = '';
          for (const part of parts) {
            if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
              combined += latexToText(part.slice(1, -1));
            } else {
              combined += part;
            }
          }
          result.push({ type: 'text', value: combined });
        }
      }
      this.setData({ parsedBlocks: result });
    }
  },

  data: {
    parsedBlocks: []
  }
});
