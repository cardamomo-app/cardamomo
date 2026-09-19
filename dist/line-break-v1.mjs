// Use a native edit so Shift+Enter stays in the paragraph and participates in Undo.
// Do not rewrite the editor or handle beforeinput: regular Enter remains native.
export function insertEditorLineBreak(editor, event) {
  if (event.defaultPrevented || event.isComposing || event.key !== 'Enter' ||
      !event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
  const doc = editor.ownerDocument, selection = doc.getSelection();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  // If unavailable, retain native keyboard handling rather than swallowing input.
  if (!doc.execCommand('insertLineBreak', false)) return false;
  event.preventDefault();event.stopPropagation();
  return true;
}
