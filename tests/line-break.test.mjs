import test from 'node:test';
import assert from 'node:assert/strict';
import { insertEditorLineBreak } from '../dist/line-break-v1.mjs';

function fixture({ supported = true, outside = false } = {}) {
  const node = {}, other = {}, calls = [];
  const event = { key: 'Enter', shiftKey: true,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.stopped = true; },
  };
  const editor = { contains: target => target === node, ownerDocument: {
    getSelection: () => ({rangeCount: 1, getRangeAt: () => ({startContainer: node, endContainer: outside ? other : node})}),
    execCommand(...args) { calls.push(args); return supported; },
  } };
  return { editor, event, calls };
}

test('Shift+Enter uses one native line-break edit and suppresses a second default edit', () => {
  const {editor,event,calls}=fixture();
  assert(insertEditorLineBreak(editor,event));
  assert.deepEqual(calls,[['insertLineBreak',false]]);
  assert(event.defaultPrevented && event.stopped);
});

test('Enter, split shortcuts, composition, and selections outside the card stay untouched', () => {
  for (const overrides of [{shiftKey:false},{metaKey:true},{ctrlKey:true},{altKey:true},{isComposing:true},{key:'a'},{defaultPrevented:true}]) {
    const {editor,event,calls}=fixture();
    assert.equal(insertEditorLineBreak(editor,Object.assign(event,overrides)),false);
    assert.deepEqual(calls,[]);
  }
  const {editor,event,calls}=fixture({outside:true});
  assert.equal(insertEditorLineBreak(editor,event),false);assert.deepEqual(calls,[]);
});

test('unsupported native edits leave the browser default available', () => {
  const {editor,event}=fixture({supported:false});
  assert.equal(insertEditorLineBreak(editor,event),false);
  assert(!event.defaultPrevented && !event.stopped);
});
