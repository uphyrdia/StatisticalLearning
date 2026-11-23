// JavaScript strings need DOUBLE backslashes. In chapter HTML, use single ones.
// notes.js starts MathJax alongside chapter loading, then typesets the selected chapter.
window.MathJax = {
  output: {
    font: 'mathjax-tex'
  },
  loader: {
    load: ['[tex]/mathtools', '[tex]/boldsymbol', '[tex]/bbm', '[tex]/braket']
  },
  tex: {
    packages: {'[+]': ['mathtools', 'boldsymbol', 'bbm']},
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true,
    tags: 'ams', // equation and align are numbered; \[...\] is not.
    macros: {
      RR: '\\mathbb{R}',
      NN: '\\mathbb{N}',
      ZZ: '\\mathbb{Z}',
      EE: '\\mathbb{E}',
      PP: '\\mathbb{P}',
      // Convenience replacements, NOT full implementations of LaTeX packages:
      bm: ['\\boldsymbol{#1}', 1],
      odif: '\\,\\mathrm{d}', // basic \odif x only; no derivative package options
      bracket: ['\\left\\langle #1,#2\\right\\rangle', 2],
      braket: ['\\left\\langle #1\\vert #2\\right\\rangle', 2],
      ket: ['\\vert #1\\rangle', 1],
      norm: ['\\left\\lVert #1\\right\\rVert', 1]
    }
  },
  startup: {typeset: false}
};
