import { replaceSelectedMarkdown, selectionTextOffset, textPoint } from './selection-edit-v1.mjs';

export function headingLine(text, level) {
  if (!Number.isInteger(level) || level < 0 || level > 4) return null;
  const previous = level === 0
    ? (text.match(/^[\t ]*#{1,6}(?:[\t ]+|$)/)?.[0] || '')
    : text.match(/^[\t ]*(?:#{1,6}(?:[\t ]+|$))?/)[0];
  const prefix = level === 0 ? '' : '#'.repeat(level) + ' ';
  return { text: prefix + text.slice(previous.length), removed: previous.length, added: prefix.length };
}

// Logical Markdown lines, independent of visual wrapping and paragraph height.
function currentLine(editor, caret) {
  const doc = editor.ownerDocument;
  let container = caret.startContainer;
  if (container === editor && editor.childNodes.length) {
    const next = editor.childNodes[caret.startOffset];
    container = next || editor.lastChild;
    caret.selectNodeContents(container);caret.collapse(!!next);
  }
  const element = container.nodeType === 1 ? container : container.parentElement;
  const block = element.closest('p,div,h1,h2,h3,h4,h5,h6,li,pre,blockquote');
  const root = block && editor.contains(block) ? block : editor;
  const line = doc.createRange();line.selectNodeContents(root);line.collapse(true);
  const containsCaret = () => line.comparePoint(caret.startContainer, caret.startOffset) === 0;
  const split = (beforeNode, beforeOffset, afterNode, afterOffset) => {
    line.setEnd(beforeNode, beforeOffset);
    if (containsCaret()) return true;
    line.setStart(afterNode, afterOffset);return false;
  };
  function visit(node) {
    if (node.nodeType === 3) {
      for (let i = node.nodeValue.indexOf('\n'); i !== -1; i = node.nodeValue.indexOf('\n', i + 1)) {
        if (split(node, i, node, i + 1)) return true;
      }
    } else if (node.nodeType === 1) {
      const parent = node.parentNode, index = [...parent.childNodes].indexOf(node);
      if (node.nodeName === 'BR') return split(parent, index, parent, index + 1);
      const block = /^(P|DIV|H[1-6]|LI|PRE|BLOCKQUOTE)$/.test(node.nodeName);
      if (block && split(parent, index, node, 0)) return true;
      for (const child of node.childNodes) if (visit(child)) return true;
      if (block && split(node, node.childNodes.length, parent, index + 1)) return true;
    }
    return false;
  }
  for (const node of root.childNodes) if (visit(node)) return line;
  line.setEnd(root, root.childNodes.length);
  return containsCaret() ? line : null;
}

export function formatCurrentHeading(editor, level) {
  const doc = editor.ownerDocument, selection = doc.getSelection();
  if (!selection?.rangeCount || !editor.contains(selection.focusNode)) return false;
  const caret = doc.createRange();caret.setStart(selection.focusNode, selection.focusOffset);caret.collapse(true);
  const line = currentLine(editor, caret);
  if (!line) return false;
  const original = line.toString(), change = headingLine(original, level);
  if (!change || change.text === original) return false;
  // Keep a native caret placeholder when removing a paragraph's only text.
  // A bare empty paragraph can otherwise send subsequent typing to its neighbor.
  if (!change.text) {
    const anchor = line.cloneRange();anchor.collapse(true);
    const wholeBlock = line.startContainer === line.endContainer && line.startContainer.nodeType === 1 &&
      line.startOffset === 0 && line.endOffset === line.startContainer.childNodes.length;
    selection.removeAllRanges();selection.addRange(line);
    const success = doc.execCommand(wholeBlock ? 'insertHTML' : 'insertText', false, wholeBlock ? '<br>' : '');
    if (success) { selection.removeAllRanges();selection.addRange(anchor); }
    return success;
  }
  const before = line.cloneRange();before.setEnd(caret.startContainer, caret.startOffset);
  const offset = selectionTextOffset(editor, line.startContainer, line.startOffset) +
    change.added + Math.max(0, before.toString().length - change.removed);
  if (!replaceSelectedMarkdown(editor, line, change.text)) return false;
  caret.setStart(...textPoint(editor, offset, true));caret.collapse(true);
  selection.removeAllRanges();selection.addRange(caret);
  return true;
}
