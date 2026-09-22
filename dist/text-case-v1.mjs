import { readMarkdownEditor } from './native-editor-v1.mjs';
import { replaceSelectedMarkdown } from './selection-edit-v1.mjs';

export const caseModes = ['lowercase', 'ALL CAPS', 'Sentence case', 'Word Case'];

const connectingWords = new Set('a an the and as at but by for from in into nor of on onto or over per so than through to under upon via vs with yet'.split(' '));

export function changeTextCase(text, mode) {
  if (mode === 0) return text.toLowerCase();
  if (mode === 1) return text.toUpperCase();
  const lower = text.toLowerCase();
  if (mode === 2) {
    return lower.replace(/(^|[.!?][”’"')\]]*\s+|\n[ \t]*\n)([^\p{L}]*)(\p{L})/gu,
      (_, boundary, prefix, letter) => boundary + prefix + letter.toUpperCase());
  }
  if (mode === 3) {
    const words = /\p{L}[\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
    const matches = [...lower.matchAll(words)];
    const first = matches[0]?.index, last = matches.at(-1)?.index;
    return lower.replace(words, (word, offset) =>
      offset !== first && offset !== last && connectingWords.has(word)
        ? word : word.replace(/^\p{L}/u, letter => letter.toUpperCase()));
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
  if (next.text !== source && !replaceSelectedMarkdown(editor, range, next.text)) return null;
  // Remember even identical-looking steps, e.g. Sentence case and Word Case for one word.
  cycles.set(editor, { ...next, range: selection.getRangeAt(0).cloneRange() });
  return next.mode;
}

export function resetCaseCycle(editor) { cycles.delete(editor); }
