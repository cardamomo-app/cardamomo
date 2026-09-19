import test from 'node:test';
import assert from 'node:assert/strict';
import { trimWordSelection } from '../dist/word-selection-v1.mjs';

// Small Range adapter verifies boundary changes without changing any text.
function fixture(text, start, end) {
  const node = { length: text.length };
  function makeRange(a, b) {
    return {
      startContainer: node, endContainer: node, startOffset: a, endOffset: b,
      cloneRange() { return makeRange(this.startOffset, this.endOffset); },
      cloneContents() { return { textContent: text.slice(this.startOffset, this.endOffset) }; },
      selectNodeContents() { this.startOffset = 0; this.endOffset = text.length; },
      setEnd(container, offset) { assert.equal(container, node); this.endOffset = offset; },
    };
  }
  const selection = {
    rangeCount: 1, isCollapsed: start === end, range: makeRange(start, end),
    getRangeAt() { return this.range; }, removeAllRanges() { this.rangeCount = 0; },
    addRange(range) { this.range = range; this.rangeCount = 1; },
  };
  const editor = {
    contains: container => container === node,
    ownerDocument: {
      getSelection: () => selection, createRange: () => makeRange(0, 0),
      createTreeWalker: () => { let visited = false; return { nextNode() { if (visited) return null; visited = true; return node; } }; },
    },
  };
  return { editor, selection };
}

test('double-click word selections drop trailing spaces without losing punctuation or Unicode', () => {
  for (const word of ['word', 'palavra', 'coração', 'idea!', '🌱']) {
    for (const space of [' ', '  ', '\u00a0', '\t']) {
      const {editor, selection} = fixture('Before ' + word + space + 'after', 7, 7 + word.length + space.length);
      assert(trimWordSelection(editor));
      assert.equal(selection.range.startOffset, 7);
      assert.equal(selection.range.endOffset, 7 + word.length);
    }
  }
});

test('already precise, whitespace-only, and wider selections are unchanged', () => {
  for (const text of ['word', '', '   ', 'two words ', 'word\n', ' word ']) {
    const {editor, selection} = fixture(text, 0, text.length);
    assert.equal(trimWordSelection(editor), false);
    assert.equal(selection.range.endOffset, text.length);
  }
});
