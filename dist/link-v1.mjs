import { readMarkdownEditor } from './native-editor-v1.mjs';
import { replaceSelectedMarkdown, selectionTextOffset, textPoint } from './selection-edit-v1.mjs';

export function clipboardLink(text) {
  let value = String(text || '').trim();
  if (/^www\./i.test(value)) value = 'https://' + value;
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return '';
  try {
    const url = new URL(value);
    if (!url.hostname) return '';
    // Keep characters in a URL from closing the Markdown destination early.
    return url.href.replace(/[()<>\\"]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
  } catch { return ''; }
}

// Read one complete inline link, including nested/escaped brackets and URLs
// containing balanced parentheses. Reference links and images stay unchanged.
export function inlineLink(text) {
  if (!text.startsWith('[')) return null;
  let depth = 1, close = -1;
  for (let i = 1; i < text.length; i++) {
    if (text[i] === '\\') { i++;continue; }
    if (text[i] === '[') depth++;
    if (text[i] === ']' && --depth === 0) { close = i;break; }
  }
  if (close < 0 || text[close + 1] !== '(') return null;
  depth = 1;
  let angle = false;
  for (let i = close + 2; i < text.length; i++) {
    if (text[i] === '\\') { i++;continue; }
    if (text[i] === '<') angle = true;
    if (text[i] === '>') angle = false;
    if (!angle && text[i] === '(') depth++;
    if (!angle && text[i] === ')' && --depth === 0) {
      return { label: text.slice(1, close), length: i + 1 };
    }
  }
  return null;
}

const pending = new WeakSet();

export async function formatMarkdownLink(editor, readClipboard = () => editor.ownerDocument.defaultView.navigator.clipboard.readText()) {
  const doc = editor.ownerDocument, selection = doc.getSelection();
  if (pending.has(editor) || !selection?.rangeCount) return false;
  const range = selection.getRangeAt(0).cloneRange();
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  const selected = readMarkdownEditor(range.cloneContents());
  const offset = selectionTextOffset(editor, range.startContainer, range.startOffset);
  const before = doc.createRange(), after = doc.createRange();
  before.selectNodeContents(editor);before.setEnd(range.startContainer, range.startOffset);
  after.selectNodeContents(editor);after.setStart(range.endContainer, range.endOffset);
  const prefix = before.toString(), suffix = after.toString();
  let existing = range.collapsed ? null : inlineLink(selected);
  if (existing?.length !== selected.length || prefix.endsWith('!')) existing = null;
  if (!existing && !range.collapsed && prefix.endsWith('[') && !/[!\\]\[$/.test(prefix)) {
    const surrounding = inlineLink('[' + selected + suffix);
    if (surrounding?.label === selected) {
      const endOffset = selectionTextOffset(editor, range.endContainer, range.endOffset);
      range.setStart(...textPoint(editor, offset - 1));
      range.setEnd(...textPoint(editor, endOffset + surrounding.length - selected.length - 1, true));
      existing = surrounding;
    }
  }
  // Removing a link never needs clipboard access.
  if (existing) return replaceSelectedMarkdown(editor, range, existing.label);

  pending.add(editor);
  const originalText = editor.textContent;
  let edited = false, url = '';
  const cancel = () => { edited = true; };
  editor.addEventListener('input', cancel);
  try {
    try { url = clipboardLink(await readClipboard()); } catch { /* Empty destination if unavailable. */ }
    const current = selection.rangeCount ? selection.getRangeAt(0) : null;
    if (edited || !editor.isConnected || doc.activeElement !== editor || editor.textContent !== originalText ||
      !current || current.startContainer !== range.startContainer || current.startOffset !== range.startOffset ||
      current.endContainer !== range.endContainer || current.endOffset !== range.endOffset) return false;
    if (!replaceSelectedMarkdown(editor, range, '[' + selected + '](' + url + ')')) return false;
    // Select only the label, or leave the caret between the empty brackets.
    const result = selection.getRangeAt(0).cloneRange();
    result.setStart(...textPoint(editor, offset + 1));
    result.setEnd(...textPoint(editor, offset + 1 + selected.replace(/\n/g, '').length, true));
    selection.removeAllRanges();selection.addRange(result);
    return true;
  } finally {
    editor.removeEventListener('input', cancel);pending.delete(editor);
  }
}
