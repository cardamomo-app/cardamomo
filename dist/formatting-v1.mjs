import { toggleMarkdownHighlight, surroundingHighlight } from './highlight-v1.mjs';
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

function outerCode(text) {
  const marker = text.match(/^`+/)?.[0];
  if (!marker || text.length <= marker.length * 2 || text.match(/`+$/)?.[0] !== marker) return null;
  let inner = text.slice(marker.length, -marker.length);
  if ([...inner.matchAll(/`+/g)].some(match => match[0].length === marker.length)) return null;
  // Markdown removes one padding space at each end of a code span.
  if (inner.startsWith(' ') && inner.endsWith(' ') && /[^ ]/.test(inner)) inner = inner.slice(1, -1);
  return { inner };
}

export function toggleMarkdownCode(markdown) {
  // Separate spans keep line breaks intact and cannot become fenced code blocks.
  return markdown.split('\n').map(line => {
    const [, before, text, after] = line.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!text) return line;
    const existing = outerCode(text);
    if (existing) return before + existing.inner + after;
    const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map(match => match[0].length));
    const marker = '`'.repeat(longest + 1);
    const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
    return before + marker + pad + text + pad + marker + after;
  }).join('\n');
}

export function surroundingCode(before, selected, after) {
  const left = before.match(/`+ ?$/)?.[0] || '';
  const right = after.match(/^ ?`+/)?.[0] || '';
  const escapes = before.slice(0, -left.length).match(/\\+$/)?.[0].length || 0;
  if (!left || !right || escapes % 2 || !outerCode(left + selected + right)) return { left: '', right: '' };
  return { left, right };
}

export function formatMarkdownSelection(editor, kind) {
  const doc = editor.ownerDocument;
  const selection = doc.getSelection();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0).cloneRange();
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  if (range.collapsed) {
    const marker = kind === 'highlight' ? '==' : kind === 'code' ? '`' : kind === 'bold' ? '**' : '*';
    const offset = selectionTextOffset(editor, range.startContainer, range.startOffset);
    if (!replaceSelectedMarkdown(editor, range, marker + marker)) return false;
    const caret = doc.createRange();
    caret.setStart(...textPoint(editor, offset + marker.length));
    caret.collapse(true);
    selection.removeAllRanges();selection.addRange(caret);
    return true;
  }
  let markdown = readMarkdownEditor(range.cloneContents());
  if (!markdown.trim()) return false;
  const before = doc.createRange(), after = doc.createRange();
  before.selectNodeContents(editor); before.setEnd(range.startContainer, range.startOffset);
  after.selectNodeContents(editor); after.setStart(range.endContainer, range.endOffset);
  const wrappers = (kind === 'highlight' ? surroundingHighlight : kind === 'code' ? surroundingCode : surroundingEmphasis)(readMarkdownEditor(before.cloneContents()), markdown, readMarkdownEditor(after.cloneContents()));
  if (wrappers.left) {
    const start = selectionTextOffset(editor, range.startContainer, range.startOffset) - wrappers.left.length;
    const end = selectionTextOffset(editor, range.endContainer, range.endOffset) + wrappers.right.length;
    range.setStart(...textPoint(editor, start));
    range.setEnd(...textPoint(editor, end, true));
    markdown = wrappers.left + markdown + wrappers.right;
  }
  const formatted = kind === 'highlight' ? toggleMarkdownHighlight(markdown) : kind === 'code' ? toggleMarkdownCode(markdown) : toggleMarkdownEmphasis(markdown, kind);
  if (formatted === markdown) return false;
  return replaceSelectedMarkdown(editor, range, formatted);
}
