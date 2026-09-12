import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMarkdownEditing } from '../dist/editor.mjs';

class Textarea extends EventTarget {
  constructor(value = '') { super(); this.value = value; this.selectionStart = this.selectionEnd = value.length; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  setRangeText(text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.setSelectionRange(start + text.length, start + text.length);
  }
  send(type, properties = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), properties);
    this.dispatchEvent(event);
    return event;
  }
}

test('repeated Enter produces one paragraph insertion and one input event per key', () => {
  const editor = new Textarea('Draft');
  attachMarkdownEditing(editor);
  let inputs = 0;
  editor.addEventListener('input', () => inputs++);
  for (let i = 0; i < 100; i++) assert(editor.send('keydown', { key: 'Enter' }).defaultPrevented);
  assert.equal(editor.value, 'Draft' + '\n\n'.repeat(100));
  assert.equal(inputs, 100);
});

test('mobile Enter replaces the selection once and can be undone and redone', () => {
  const editor = new Textarea('One|Two');
  attachMarkdownEditing(editor);
  editor.setSelectionRange(3, 4);
  assert(editor.send('beforeinput', { inputType: 'insertLineBreak' }).defaultPrevented);
  assert.equal(editor.value, 'One\n\nTwo');
  assert.equal(editor.selectionStart, 5);
  editor.send('keydown', { key: 'z', metaKey: true });
  assert.equal(editor.value, 'One|Two');
  assert.equal(editor.selectionStart, 3);
  assert.equal(editor.selectionEnd, 4);
  editor.send('keydown', { key: 'z', metaKey: true, shiftKey: true });
  assert.equal(editor.value, 'One\n\nTwo');
});

test('Shift Enter creates a Markdown hard break and composition Enter is left alone', () => {
  const editor = new Textarea('One');
  attachMarkdownEditing(editor);
  editor.send('keydown', { key: 'Enter', shiftKey: true });
  assert.equal(editor.value, 'One  \n');
  assert.equal(editor.send('keydown', { key: 'Enter', isComposing: true }).defaultPrevented, false);
  assert.equal(editor.value, 'One  \n');
});

test('new typing after undo discards the redo branch without losing the paragraph', () => {
  const editor = new Textarea('One');
  attachMarkdownEditing(editor);
  editor.send('keydown', { key: 'Enter' });
  editor.send('beforeinput', { inputType: 'insertText' });
  editor.setRangeText('Two', editor.selectionStart, editor.selectionEnd);
  editor.send('input', { inputType: 'insertText' });
  editor.send('keydown', { key: 'z', ctrlKey: true });
  assert.equal(editor.value, 'One\n\n');
  editor.send('beforeinput', { inputType: 'insertText' });
  editor.setRangeText('Three', editor.selectionStart, editor.selectionEnd);
  editor.send('input', { inputType: 'insertText' });
  editor.send('keydown', { key: 'y', ctrlKey: true });
  assert.equal(editor.value, 'One\n\nThree');
});
