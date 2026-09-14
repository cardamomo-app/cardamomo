import { createMarkdownEditor } from './native-editor-v1.mjs';

export function selectionTextOffset(editor, container, offset) {
  const before = editor.ownerDocument.createRange();
  before.selectNodeContents(editor);
  before.setEnd(container, offset);
  return before.cloneContents().textContent.length;
}

export function textPoint(editor, offset, end = false) {
  const walker = editor.ownerDocument.createTreeWalker(editor, 4);
  let node, last;
  while ((node = walker.nextNode())) {
    last = node;
    if (offset < node.length || (end && offset === node.length)) return [node, offset];
    offset -= node.length;
  }
  return last ? [last, last.length] : [editor, 0];
}

// Replace in one native edit so browser Undo works, then select the replacement.
export function replaceSelectedMarkdown(editor, range, markdown) {
  const doc = editor.ownerDocument, selection = doc.getSelection();
  const startOffset = selectionTextOffset(editor, range.startContainer, range.startOffset);
  selection.removeAllRanges();
  selection.addRange(range);
  const success = markdown.includes('\n')
    ? doc.execCommand('insertHTML', false, createMarkdownEditor(markdown, doc).innerHTML)
    : doc.execCommand('insertText', false, markdown);
  if (!success || !selection.rangeCount) return false;
  const result = selection.getRangeAt(0).cloneRange();
  result.setStart(...textPoint(editor, startOffset));
  selection.removeAllRanges();
  selection.addRange(result);
  return true;
}
