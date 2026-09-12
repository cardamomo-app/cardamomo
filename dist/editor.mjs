// Keep paragraph insertion independent of browser editing commands. In some
// browsers execCommand emits beforeinput again and re-enters the Enter handler.
export function attachMarkdownEditing(editor) {
  const snapshot = () => ({ value: editor.value, start: editor.selectionStart, end: editor.selectionEnd });
  let history = [snapshot()], index = 0, restoring = false, composing = false;
  let lastInputType = '', lastInputAt = 0;

  function notify() {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function insert(text) {
    history[index] = snapshot();
    editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end');
    notify();
  }

  function restore(delta) {
    const next = index + delta;
    if (next < 0 || next >= history.length) return;
    index = next;
    const entry = history[index];
    restoring = true;
    try {
      editor.value = entry.value;
      editor.setSelectionRange(entry.start, entry.end);
      notify();
    } finally {
      restoring = false;
      lastInputType = '';
    }
  }

  editor.addEventListener('compositionstart', () => { composing = true; });
  editor.addEventListener('compositionend', () => { composing = false; });
  editor.addEventListener('input', event => {
    if (restoring || editor.value === history[index].value) return;
    const now = Date.now();
    const group = event.inputType === 'insertText' && lastInputType === 'insertText' &&
      now - lastInputAt < 750 && index > 0 && index === history.length - 1;
    history.splice(index + 1);
    if (group) history[index] = snapshot();
    else { history.push(snapshot()); index++; }
    if (history.length > 200) { history.shift(); index--; }
    lastInputType = event.inputType || '';
    lastInputAt = now;
  });

  editor.addEventListener('beforeinput', event => {
    if (event.isComposing || composing) return;
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
      event.preventDefault();
      restore(event.inputType === 'historyUndo' ? -1 : 1);
    } else if (event.cancelable && ['insertParagraph', 'insertLineBreak'].includes(event.inputType)) {
      // Covers mobile keyboards that do not send keydown events.
      event.preventDefault();
      insert('\n\n');
    } else {
      const previous = history[index];
      if (previous.start !== editor.selectionStart || previous.end !== editor.selectionEnd) lastInputType = '';
      history[index] = snapshot();
    }
  });

  editor.addEventListener('keydown', event => {
    if (event.isComposing || composing || event.keyCode === 229) return;
    const modifier = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (modifier && !event.altKey && (key === 'z' || key === 'y')) {
      event.preventDefault();
      event.stopPropagation();
      restore(key === 'y' || event.shiftKey ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      insert(event.key === 'Tab' ? '  ' : event.shiftKey ? '  \n' : '\n\n');
    }
  });
}
