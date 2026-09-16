import test from 'node:test';
import assert from 'node:assert/strict';
import { headingLine } from '../dist/heading-v1.mjs';

test('heading levels replace prefixes without changing the text or inline formatting', () => {
  for (let level = 1; level <= 4; level++) {
    for (const input of ['Title **bold**', '# Title **bold**', '###### Title **bold**', '  ###\tTitle **bold**']) {
      assert.equal(headingLine(input, level).text, '#'.repeat(level) + ' Title **bold**');
    }
  }
});
test('empty lines, literal hashes, and indentation become valid headings', () => {
  assert.equal(headingLine('', 1).text, '# ');
  assert.equal(headingLine('###', 2).text, '## ');
  assert.equal(headingLine('#hashtag', 3).text, '### #hashtag');
  assert.equal(headingLine('    Title', 4).text, '#### Title');
  assert.equal(headingLine('Title', 5), null);
});

test('level zero removes heading prefixes and preserves ordinary lines', () => {
  assert.equal(headingLine('### Title **bold**', 0).text, 'Title **bold**');
  assert.equal(headingLine('###### Title', 0).text, 'Title');
  assert.equal(headingLine('## ', 0).text, '');
  assert.equal(headingLine('  Title', 0).text, '  Title');
  assert.equal(headingLine('#hashtag', 0).text, '#hashtag');
});
