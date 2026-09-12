import { createMarkdownEditor, readMarkdownEditor } from './native-editor-v1.mjs';

// Keep formatting in the Markdown source, including when saved or exported.
export function toggleMarkdownEmphasis(markdown, kind) {
  const width = kind === 'bold' ? 2 : 1;
  return markdown.split('\n\n').map(paragraph => {
    const match = paragraph.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const [, before, text, after] = match;
    if (!text || /^\*+$/.test(text)) return paragraph;
    const left = text.match(/^\*+/)?.[0].length || 0;
    const right = text.match(/\*+$/)?.[0].length || 0;
    const count = Math.min(left, right);
    const singleWrapper = left === right && text.length > count * 2 && !text.slice(count, -count || undefined).includes('*'.repeat(count));
    const active = singleWrapper && count <= 3 && (width === 2 ? count >= 2 : count % 2 === 1);
    const result = active ? text.slice(width, -width) : '*'.repeat(width) + text + '*'.repeat(width);
    return before + result + after;
  }).join('\n\n');
}

export function formatMarkdownSelection(editor, kind) {
  const doc = editor.ownerDocument;
  const selection = doc.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  const markdown = readMarkdownEditor(range.cloneContents());
  if (!markdown.trim()) return false;
  const formatted = toggleMarkdownEmphasis(markdown, kind);
  // One native edit preserves the browser's typing undo history. This runs
  // only for B/I keydown, never for Enter, input, or beforeinput.
  if (!formatted.includes('\n')) return doc.execCommand('insertText', false, formatted);
  const replacement = createMarkdownEditor(formatted, doc);
  return doc.execCommand('insertHTML', false, replacement.innerHTML);
}
