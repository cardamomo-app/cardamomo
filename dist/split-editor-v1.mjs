import { readMarkdownEditor } from './native-editor-v1.mjs';

// A selected passage stays in the lower card: splitting never deletes text.
export function readEditorSplit(editor) {
  const selection=editor.ownerDocument.getSelection();
  if(!selection?.rangeCount)return null;
  const cursor=selection.getRangeAt(0);
  if(!editor.contains(cursor.startContainer)||!editor.contains(cursor.endContainer))return null;
  const before=editor.ownerDocument.createRange(),after=editor.ownerDocument.createRange();
  before.selectNodeContents(editor);before.setEnd(cursor.startContainer,cursor.startOffset);
  after.selectNodeContents(editor);after.setStart(cursor.startContainer,cursor.startOffset);
  return {before:readMarkdownEditor(before.cloneContents()),after:readMarkdownEditor(after.cloneContents())};
}

export function focusEditorStart(editor) {
  editor.focus();
  const range=editor.ownerDocument.createRange();
  range.selectNodeContents(editor.firstElementChild||editor);range.collapse(true);
  const selection=editor.ownerDocument.getSelection();selection.removeAllRanges();selection.addRange(range);
}
