'use strict';

const chapterRoot = document.getElementById('chapters');
const statusLine = document.getElementById('status');
const proofElements = () => [...chapterRoot.querySelectorAll('details.proof')];

document.getElementById('expand-proofs').onclick = () => {
  proofElements().forEach(proof => { proof.open = true; });
};
document.getElementById('collapse-proofs').onclick = () => {
  proofElements().forEach(proof => { proof.open = false; });
};

// Also works with the browser's own Print menu. Restore the reader's view afterwards.
let printState = null;
window.addEventListener('beforeprint', () => {
  if (printState) return;
  printState = proofElements().map(proof => [proof, proof.open]);
  printState.forEach(([proof]) => { proof.open = true; });
});
window.addEventListener('afterprint', () => {
  if (!printState) return;
  printState.forEach(([proof, wasOpen]) => { proof.open = wasOpen; });
  printState = null;
});
document.getElementById('print-notes').onclick = () => window.print();

// Open a closed proof when a link points to something inside it.
function revealTarget() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  for (let node = target; node; node = node.parentElement) {
    if (node.matches('details')) node.open = true;
  }
  target.scrollIntoView({block: 'start'});
}
window.addEventListener('hashchange', revealTarget);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && link.hash === location.hash) requestAnimationFrame(revealTarget);
});

function chapterURL(chapter, targetId = '') {
  const url = new URL(location.href);
  url.searchParams.set('chapter', chapter.id);
  url.hash = targetId ? encodeURIComponent(targetId) : '';
  return url.pathname + url.search + url.hash;
}

function contentsLink(number, title, href) {
  const link = document.createElement('a');
  link.className = 'contents-link';
  link.href = href;
  const contentsNumber = document.createElement('span');
  contentsNumber.className = 'contents-number';
  contentsNumber.textContent = number;
  const contentsTitle = document.createElement('span');
  contentsTitle.className = 'contents-title';
  contentsTitle.textContent = title;
  link.append(contentsNumber, ' ', contentsTitle);
  return link;
}

function showChapterIndex(chapters) {
  document.getElementById('chapter-label').replaceChildren();
  document.getElementById('chapter-title').textContent = 'Mathematics';
  document.querySelector('.toolbar').hidden = true;
  document.getElementById('chapter-navigation').hidden = true;
  document.title = 'Mathematics — Personal notes';
  const list = document.createElement('ol');
  list.className = 'chapter-list';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Chapters');
  list.style.setProperty('--chapter-number-width', `${Math.max(2, String(chapters.length).length)}ch`);
  chapters.forEach((chapter, index) => {
    const item = document.createElement('li');
    item.append(contentsLink(index + 1, chapter.dataset.title, chapterURL(chapter)));
    list.append(item);
  });
  chapterRoot.replaceChildren(list);
}

function buildContents(chapters, activeChapter) {
  const contents = document.getElementById('contents');
  // Reserve the same number column for every chapter, including multi-digit ones.
  contents.style.setProperty('--chapter-number-width', `${Math.max(2, String(chapters.length).length)}ch`);
  for (const level of ['section', 'subsection']) {
    const lengths = chapters.flatMap(chapter =>
      [...chapter.querySelectorAll(`.${level}-heading > .heading-number`)]
        .map(number => number.textContent.length));
    contents.style.setProperty(`--${level}-number-width`, `${Math.max(2, ...lengths) + .25}ch`);
  }
  chapters.forEach((chapter, index) => {
    const chapterNumber = index + 1;
    const title = chapter.dataset.title;
    const item = document.createElement('li');
    const link = contentsLink(chapterNumber, title, chapterURL(chapter));
    if (chapter === activeChapter) link.setAttribute('aria-current', 'page');
    item.append(link);
    const sections = document.createElement('ol');
    sections.className = 'contents-sections';
    sections.setAttribute('role', 'list');
    let sectionItem;
    let subsections;
    chapter.querySelectorAll('h3.section-heading, h4.subsection-heading').forEach(heading => {
      const number = heading.querySelector(':scope > .heading-number');
      if (!number || !heading.id) return;
      const title = heading.cloneNode(true);
      title.querySelector(':scope > .heading-number').remove();
      const href = chapter === activeChapter
        ? `#${encodeURIComponent(heading.id)}`
        : chapterURL(chapter, heading.id);
      const entry = document.createElement('li');
      entry.append(contentsLink(number.textContent, title.textContent.trim(), href));
      if (heading.matches('h3.section-heading')) {
        sectionItem = entry;
        subsections = null;
        sections.append(entry);
      } else if (sectionItem) {
        if (!subsections) {
          subsections = document.createElement('ol');
          subsections.className = 'contents-subsections';
          subsections.setAttribute('role', 'list');
          sectionItem.append(subsections);
        }
        subsections.append(entry);
      }
    });
    if (sections.children.length) item.append(sections);
    contents.append(item);
  });
}

function numberStatements(chapters) {
  const labels = new Map();
  const usedIds = new Set([...document.querySelectorAll('[id]')].map(node => node.id));
  chapters.forEach(chapter => {
    usedIds.add(chapter.id);
    chapter.querySelectorAll('[id]').forEach(node => usedIds.add(node.id));
  });
  chapters.forEach((chapter, index) => {
    const chapterNumber = index + 1;
    // Opt-in section headings: leave ordinary h3/h4 headings unnumbered.
    let sectionNumber = 0;
    let subsectionNumber = 0;
    chapter.querySelectorAll('h3.section-heading, h4.subsection-heading').forEach(heading => {
      let label;
      if (heading.matches('h3.section-heading')) {
        sectionNumber += 1;
        subsectionNumber = 0;
        label = `${chapterNumber}.${sectionNumber}`;
      } else {
        // A subsection belongs after a section heading.
        if (!sectionNumber) return;
        subsectionNumber += 1;
        label = `${chapterNumber}.${sectionNumber}.${subsectionNumber}`;
      }
      const number = document.createElement('span');
      number.className = 'heading-number';
      number.textContent = label;
      heading.prepend(number, ' ');
      if (!heading.id) {
        const baseId = `${chapter.id}-section-${label.replace(/\./g, '-')}`;
        let id = baseId;
        let suffix = 2;
        while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
        heading.id = id;
        usedIds.add(id);
      }
      labels.set(heading.id, `Section ${label}`);
    });
    // One shared counter per chapter for definitions, theorems, lemmas, etc.
    chapter.querySelectorAll('.statement').forEach((statement, i) => {
      const kind = statement.dataset.kind || 'Theorem';
      const statementNumber = `${chapterNumber}.${i + 1}`;
      const label = `${kind} ${statementNumber}`;
      const heading = document.createElement('h3');
      const number = document.createElement('span');
      number.className = 'heading-number';
      number.textContent = statementNumber;
      heading.append(`${kind} `, number,
        statement.dataset.title ? ` (${statement.dataset.title})` : '');
      statement.prepend(heading);
      if (statement.id) labels.set(statement.id, label);
    });
  });
  return labels;
}

function connectReferences(activeChapter, targets, labels) {
  const targetURL = id => {
    const chapter = targets.get(id);
    return chapter && chapter !== activeChapter
      ? chapterURL(chapter, id)
      : `#${encodeURIComponent(id)}`;
  };
  activeChapter.querySelectorAll('a[data-ref]').forEach(link => {
    const id = link.dataset.ref;
    link.href = targetURL(id);
    link.textContent = labels.get(id) || `[missing reference: ${id}]`;
  });
  // Plain anchor links can also point into another chapter or a closed proof.
  activeChapter.querySelectorAll('a[href^="#"]').forEach(link => {
    let id;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch { return; }
    if (targets.has(id)) link.href = targetURL(id);
  });
}

async function initializeMathJax() {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml-nofont.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('MathJax download failed'));
    document.head.append(script);
  });
  await MathJax.startup.promise;
}

async function typesetChapter() {
  // Typeset at full proof width, then restore the initially collapsed view.
  const states = proofElements().map(proof => [proof, proof.open]);
  states.forEach(([proof]) => { proof.open = true; });
  try {
    await MathJax.typesetPromise([chapterRoot]);
  } finally {
    states.forEach(([proof, wasOpen]) => { proof.open = wasOpen; });
  }
}

async function start() {
  if (location.protocol === 'file:') {
    statusLine.textContent = 'To load chapters, run python -m http.server 8000 --bind 127.0.0.1 in this folder, then open http://localhost:8000/.';
    statusLine.className = 'error';
    return;
  }
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  if (!chapters.length) throw new Error('Add a chapter to index.html first.');
  const requestedChapter = new URLSearchParams(location.search).get('chapter');
  const selectedByQuery = chapters.find(chapter => chapter.id === requestedChapter);
  let hashId = '';
  try { hashId = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed hashes. */ }
  // Chapter pages download MathJax alongside the fragments. The chapter index
  // needs no math engine; legacy hash links start it once their chapter is known.
  const startMathJax = () => initializeMathJax().then(
    () => ({ok: true}), error => ({ok: false, error})
  );
  const mathJaxReady = selectedByQuery ? startMathJax() : null;
  // Inert storage prevents inactive chapters from loading images/iframes.
  // Appending the selected chapter below activates only its resources.
  const chapterStore = document.createElement('template');
  chapterStore.content.append(...chapters);
  if (!selectedByQuery && !hashId) showChapterIndex(chapters);
  const failures = [];
  // Read all fragments to index cross-chapter labels and anchor destinations.
  await Promise.all(chapters.map(async chapter => {
    try {
      const response = await fetch(chapter.dataset.chapter);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Only include your own trusted HTML fragments here.
      chapter.innerHTML = await response.text();
    } catch (error) {
      failures.push(chapter.dataset.chapter);
      const message = document.createElement('p');
      message.className = 'error';
      message.textContent = `Could not load ${chapter.dataset.chapter}: ${error.message}`;
      chapter.append(message);
    }
  }));
  const labels = numberStatements(chapters);
  const targets = new Map();
  chapters.forEach(chapter => {
    targets.set(chapter.id, chapter);
    chapter.querySelectorAll('[id]').forEach(node => targets.set(node.id, chapter));
  });
  // Old links such as /#thm-bounded still open their chapter.
  const activeChapter = requestedChapter
    ? selectedByQuery
    : targets.get(hashId);
  buildContents(chapters, activeChapter);
  const warnings = [];
  if (requestedChapter && !activeChapter) {
    warnings.push(`Unknown chapter "${requestedChapter}"; choose a chapter below.`);
  }
  if (failures.length) warnings.push(`Could not load: ${failures.join(', ')}. Some references may be unavailable.`);
  if (!activeChapter) {
    showChapterIndex(chapters);
    statusLine.textContent = warnings.join(' ');
    statusLine.className = warnings.length ? 'error' : '';
    revealTarget();
    return;
  }
  const activeIndex = chapters.indexOf(activeChapter);
  connectReferences(activeChapter, targets, labels);
  chapterRoot.replaceChildren(activeChapter);
  document.querySelector('.toolbar').hidden = false;

  const chapterNumber = document.createElement('span');
  chapterNumber.className = 'heading-number';
  chapterNumber.textContent = activeIndex + 1;
  document.getElementById('chapter-label').replaceChildren('Chapter ', chapterNumber);
  document.getElementById('chapter-title').textContent = activeChapter.dataset.title;
  activeChapter.setAttribute('aria-labelledby', 'chapter-heading');
  document.title = `Chapter ${activeIndex + 1}: ${activeChapter.dataset.title} — Mathematics`;
  const nextChapter = chapters[activeIndex + 1];
  if (nextChapter) {
    const nextLink = document.getElementById('next-chapter');
    nextLink.href = chapterURL(nextChapter);
    nextLink.textContent = `Next chapter: ${nextChapter.dataset.title} →`;
    document.getElementById('chapter-navigation').hidden = false;
  }
  revealTarget();
  statusLine.textContent = 'Typesetting mathematics…';
  try {
    const mathJax = await (mathJaxReady || startMathJax());
    if (!mathJax.ok) throw mathJax.error;
    await typesetChapter();
    statusLine.textContent = warnings.join(' ');
    statusLine.className = warnings.length ? 'error' : '';
  } catch (error) {
    statusLine.className = 'error';
    statusLine.textContent = [...warnings, 'The available chapter text is loaded, but mathematics could not be typeset. Check your internet connection and refresh. ' + error.message].join(' ');
  }
  revealTarget();
}
start().catch(error => {
  statusLine.className = 'error';
  statusLine.textContent = `Could not finish loading the notebook: ${error.message}`;
});
