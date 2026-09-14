import { readMarkdownEditor } from './native-editor-v1.mjs';
import { replaceSelectedMarkdown, selectionTextOffset, textPoint } from './selection-edit-v1.mjs';

function outerEmphasis(text) {
  for (const marker of ['***', '___', '**', '__', '*', '_']) {
    if (!text.startsWith(marker) || !text.endsWith(marker) || text.length <= marker.length * 2) continue;
    const inner = text.slice(marker.length, -marker.length);
    if (!inner.trim() || /^\s|\s$/.test(inner) || inner.includes(marker) || inner.endsWith('\\')) continue;
    return { inner, bold: marker.length >= 2, italic: marker.length % 2 === 1 };
  }
  return null;
}

// A double-click often selects the word but leaves its Markdown markers outside.
export function surroundingEmphasis(before, selected, after) {
  const left = before.match(/[*_]+$/)?.[0] || '';
  const right = after.match(/^[*_]+/)?.[0] || '';
  if (!left || left.length > 6 || right !== [...left].reverse().join('')) return { left: '', right: '' };
  const escapes = before.slice(0, -left.length).match(/\\+$/)?.[0].length || 0;
  if (escapes % 2 || !outerEmphasis(left + selected + right)) return { left: '', right: '' };
  return { left, right };
}

// Keep formatting in the Markdown source, including when saved or exported.
export function toggleMarkdownEmphasis(markdown, kind) {
  return markdown.split('\n\n').map(paragraph => {
    const match = paragraph.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const [, before, text, after] = match;
    if (!text || /^\*+$/.test(text)) return paragraph;
    let inner = text, bold = false, italic = false, layer;
    while ((layer = outerEmphasis(inner))) {
      bold ||= layer.bold; italic ||= layer.italic; inner = layer.inner;
    }
    if (kind === 'bold') bold = !bold; else italic = !italic;
    const markers = '*'.repeat((bold ? 2 : 0) + (italic ? 1 : 0));
    const result = markers + inner + markers;
    return before + result + after;
  }).join('\n\n');
}

export function formatMarkdownSelection(editor, kind) {
  const doc = editor.ownerDocument;
  const selection = doc.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0).cloneRange();
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  let markdown = readMarkdownEditor(range.cloneContents());
  if (!markdown.trim()) return false;
  const before = doc.createRange(), after = doc.createRange();
  before.selectNodeContents(editor); before.setEnd(range.startContainer, range.startOffset);
  after.selectNodeContents(editor); after.setStart(range.endContainer, range.endOffset);
  const wrappers = surroundingEmphasis(readMarkdownEditor(before.cloneContents()), markdown, readMarkdownEditor(after.cloneContents()));
  if (wrappers.left) {
    const start = selectionTextOffset(editor, range.startContainer, range.startOffset) - wrappers.left.length;
    const end = selectionTextOffset(editor, range.endContainer, range.endOffset) + wrappers.right.length;
    range.setStart(...textPoint(editor, start));
    range.setEnd(...textPoint(editor, end, true));
    markdown = wrappers.left + markdown + wrappers.right;
  }
  const formatted = toggleMarkdownEmphasis(markdown, kind);
  if (formatted === markdown) return false;
  return replaceSelectedMarkdown(editor, range, formatted);
}
