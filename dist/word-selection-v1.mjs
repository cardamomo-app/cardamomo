import { selectionTextOffset, textPoint } from './selection-edit-v1.mjs';

// Normalize only native word selections; deliberate wider selections are untouched.
export function trimWordSelection(editor) {
  const selection = editor.ownerDocument.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0).cloneRange();
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  const text = range.cloneContents().textContent;
  const word = text.match(/^(\S+)[ \t\u00a0]+$/)?.[1];
  if (!word) return false;
  const start = selectionTextOffset(editor, range.startContainer, range.startOffset);
  range.setEnd(...textPoint(editor, start + word.length, true));
  selection.removeAllRanges();selection.addRange(range);
  return true;
}
