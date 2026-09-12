// Paragraphs and undo belong to the browser. This adapter only reads/writes
// Markdown at the editing boundary; it never handles Enter or beforeinput.
export function createMarkdownEditor(text, doc = document) {
  const editor = doc.createElement('div');
  editor.className = 'card-editor';
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', 'true');
  editor.setAttribute('aria-label', 'Write in Markdown');
  editor.spellcheck = true;
  for (const paragraph of text.split('\n\n')) {
    const p = doc.createElement('p');
    paragraph.split('\n').forEach((line, index) => {
      if (index) { const br = doc.createElement('br'); br.dataset.markdownSoft = 'true'; p.append(br); }
      if (line) p.append(doc.createTextNode(line));
    });
    // A final BR is the browser's caret placeholder, not document content.
    if (!paragraph || paragraph.endsWith('\n')) p.append(doc.createElement('br'));
    editor.append(p);
  }
  return editor;
}

export function readMarkdownEditor(editor) {
  const blocks = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE']);
  function inline(node) {
    if (node.nodeType === 3) return node.nodeValue.replace(/\n/g, '  \n');
    if (node.nodeName === 'BR') return node.dataset.markdownSoft ? '\n' : '  \n';
    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return '';
    return [...node.childNodes].map(inline).join('');
  }
  function paragraph(node) {
    const children = [...node.childNodes];
    if (children.at(-1)?.nodeName === 'BR' && !children.at(-1).dataset.markdownSoft) children.pop();
    return children.map(inline).join('');
  }
  const paragraphs = [];
  let pending = '';
  const nodes = [...editor.childNodes];
  if (nodes.at(-1)?.nodeName === 'BR' && !nodes.at(-1).dataset.markdownSoft) nodes.pop();
  for (const node of nodes) {
    if (blocks.has(node.nodeName)) {
      if (pending) { paragraphs.push(pending); pending = ''; }
      paragraphs.push(paragraph(node));
    } else pending += inline(node);
  }
  if (pending) paragraphs.push(pending);
  return paragraphs.join('\n\n').replace(/\u00a0/g, ' ');
}

export function focusMarkdownEditor(editor) {
  editor.focus();
  const last = editor.lastElementChild || editor;
  const range = editor.ownerDocument.createRange();
  if (last.textContent === '') range.setStart(last, 0);
  else { range.selectNodeContents(last); range.collapse(false); }
  const selection = editor.ownerDocument.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
