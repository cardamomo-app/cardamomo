import { readMarkdownEditor } from './native-editor-v1.mjs';
import { replaceSelectedMarkdown, selectionTextOffset, textPoint } from './selection-edit-v1.mjs';

const pairs = new Map([['(', ')'], ['"', '"'], ['[', ']'], ['{', '}']]);
const closers = new Set(pairs.values());

export function planSymbolPair(symbol, selected, following, collapsed) {
  if (collapsed && closers.has(symbol) && following.startsWith(symbol)) return { skip: true };
  const closing = pairs.get(symbol);
  return closing ? { markdown: symbol + selected + closing } : null;
}

export function completeSymbolPair(editor, event) {
  // Option produces punctuation on layouts such as Portuguese; use the resulting key.
  if (event.isComposing || event.metaKey || event.ctrlKey ||
      (!pairs.has(event.key) && !closers.has(event.key))) return false;
  const doc = editor.ownerDocument, selection = doc.getSelection();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0).cloneRange();
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  const collapsed = range.collapsed;
  const after = doc.createRange();
  after.selectNodeContents(editor);after.setStart(range.endContainer, range.endOffset);
  const plan = planSymbolPair(event.key, readMarkdownEditor(range.cloneContents()),
    readMarkdownEditor(after.cloneContents()), collapsed);
  if (!plan) return false;
  event.preventDefault();event.stopPropagation();
  const start = selectionTextOffset(editor, range.startContainer, range.startOffset);
  if (plan.skip) {
    const caret = doc.createRange();caret.setStart(...textPoint(editor, start + 1, true));caret.collapse(true);
    selection.removeAllRanges();selection.addRange(caret);
    return true;
  }
  if (!replaceSelectedMarkdown(editor, range, plan.markdown)) return false;
  const inserted = selection.getRangeAt(0);
  const end = selectionTextOffset(editor, inserted.endContainer, inserted.endOffset) - 1;
  const inner = doc.createRange();
  inner.setStart(...textPoint(editor, start + 1));
  if (collapsed) inner.collapse(true);
  else inner.setEnd(...textPoint(editor, end, true));
  selection.removeAllRanges();selection.addRange(inner);
  return true;
}
