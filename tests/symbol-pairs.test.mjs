import test from 'node:test';
import assert from 'node:assert/strict';
import { planSymbolPair, completeSymbolPair } from '../dist/symbol-pairs-v1.mjs';

test('opening symbols insert pairs and wrap literal Markdown, paragraphs, and Unicode', () => {
  for (const [left, right] of [['(', ')'], ['"', '"'], ['[', ']'], ['{', '}']]) {
    assert.deepEqual(planSymbolPair(left, '', '', true), { markdown: left + right });
    for (const text of ['word', '**a thought**', 'one\n\ntwo', 'a 🌱', '']) {
      assert.deepEqual(planSymbolPair(left, text, '', false), { markdown: left + text + right });
    }
  }
});

test('closing a pair does not duplicate its right symbol or skip across a line break', () => {
  for (const close of [')', '"', ']', '}']) {
    assert.deepEqual(planSymbolPair(close, '', close + ' after', true), { skip: true });
    assert.notDeepEqual(planSymbolPair(close, '', '\n\n' + close, true), { skip: true });
  }
  assert.deepEqual(planSymbolPair('"', 'word', '"', false), { markdown: '"word"' });
  assert.deepEqual(planSymbolPair('(', '', ')', true), { markdown: '()' });
  assert.equal(planSymbolPair(')', 'word', ')', false), null);
  assert.equal(planSymbolPair(')', '', '', true), null);
  assert.equal(planSymbolPair('a', '', '', true), null);
});

test('composition and keyboard shortcuts never enter pair editing', () => {
  for (const modifier of ['isComposing', 'metaKey', 'ctrlKey']) {
    assert.equal(completeSymbolPair(null, { key: '[', [modifier]: true }), false);
  }
  assert.equal(completeSymbolPair(null, { key: 'Enter' }), false);
});


test('Option-generated brackets reach pair editing while modified navigation does not', () => {
  let selectionReads = 0;
  const editor = { ownerDocument: { getSelection() { selectionReads++; return null; } } };
  for (const key of ['[', ']', '{', '}']) {
    for (const shiftKey of [false, true]) {
      const before = selectionReads;
      // With no selection available the handler safely stops after accepting the key.
      assert.equal(completeSymbolPair(editor, { key, altKey: true, shiftKey }), false);
      assert.equal(selectionReads, before + 1);
    }
  }
  const before = selectionReads;
  for (const event of [
    { key: 'ArrowRight', altKey: true },
    { key: '[', altKey: true, ctrlKey: true },
    { key: '{', altKey: true, metaKey: true },
  ]) assert.equal(completeSymbolPair(editor, event), false);
  assert.equal(selectionReads, before);
});
