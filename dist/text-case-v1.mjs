import { createMarkdownEditor, readMarkdownEditor } from './native-editor-v1.mjs';

export const caseModes = ['lowercase', 'ALL CAPS', 'Sentence case', 'Word Case'];

export function changeTextCase(text, mode) {
  if (mode === 0) return text.toLowerCase();
  if (mode === 1) return text.toUpperCase();
  const lower = text.toLowerCase();
  if (mode === 2) {
    return lower.replace(/(^|[.!?][”’"')\]]*\s+|\n[ \t]*\n)([^\p{L}]*)(\p{L})/gu,
      (_, boundary, prefix, letter) => boundary + prefix + letter.toUpperCase());
  }
  if (mode === 3) {
    return lower.replace(/\p{L}[\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}\p{N}]+)*/gu,
      word => word.replace(/^\p{L}/u, letter => letter.toUpperCase()));
  }
  throw new Error('Unknown text case');
}

export function nextTextCase(text, previousMode) {
  if (!/\p{L}/u.test(text)) return null;
  const current = previousMode ?? caseModes.findIndex((_, index) => changeTextCase(text, index) === text);
  const mode = (current + 1) % caseModes.length;
  return { mode, text: changeTextCase(text, mode) };
}

const cycles = new WeakMap();
const sameRange = (a, b) => a.startContainer === b.startContainer && a.startOffset === b.startOffset &&
  a.endContainer === b.endContainer && a.endOffset === b.endOffset;

export function cycleSelectedText(editor) {
  const doc = editor.ownerDocument, selection = doc.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
  const source = readMarkdownEditor(range.cloneContents());
  const last = cycles.get(editor);
  const next = nextTextCase(source, last && last.text === source && sameRange(last.range, range) ? last.mode : undefined);
  if (!next) return null;
  if (next.text !== source) {
    const before = doc.createRange();
    before.selectNodeContents(editor);
    before.setEnd(range.startContainer, range.startOffset);
    const startOffset = before.cloneContents().textContent.length;
    // One native edit keeps case changes in the browser's typing undo history.
    const success = next.text.includes('\n')
      ? doc.execCommand('insertHTML', false, createMarkdownEditor(next.text, doc).innerHTML)
      : doc.execCommand('insertText', false, next.text);
    if (!success || !selection.rangeCount) return null;
    const result = selection.getRangeAt(0).cloneRange();
    const walker = doc.createTreeWalker(editor, 4); // Text nodes; offsets remain valid when Unicode changes length.
    let remaining = startOffset, node;
    while ((node = walker.nextNode())) {
      if (remaining < node.length) { result.setStart(node, remaining); break; }
      remaining -= node.length;
    }
    selection.removeAllRanges();
    selection.addRange(result);
  }
  // Remember even identical-looking steps, e.g. Sentence case and Word Case for one word.
  cycles.set(editor, { ...next, range: selection.getRangeAt(0).cloneRange() });
  return next.mode;
}

export function resetCaseCycle(editor) { cycles.delete(editor); }
