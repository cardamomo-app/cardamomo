import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleMarkdownEmphasis } from '../dist/formatting-v1.mjs';

test('bold and italic toggle individually and in combination', () => {
  assert.equal(toggleMarkdownEmphasis('word', 'bold'), '**word**');
  assert.equal(toggleMarkdownEmphasis('word', 'italic'), '*word*');
  assert.equal(toggleMarkdownEmphasis('**word**', 'bold'), 'word');
  assert.equal(toggleMarkdownEmphasis('*word*', 'italic'), 'word');
  assert.equal(toggleMarkdownEmphasis('*word*', 'bold'), '***word***');
  assert.equal(toggleMarkdownEmphasis('**word**', 'italic'), '***word***');
  assert.equal(toggleMarkdownEmphasis('***word***', 'bold'), '*word*');
  assert.equal(toggleMarkdownEmphasis('***word***', 'italic'), '**word**');
  assert.equal(toggleMarkdownEmphasis('***', 'bold'), '***');
  assert.equal(toggleMarkdownEmphasis('**one** and **two**', 'bold'), '****one** and **two****');
});

test('selection whitespace stays outside delimiters and paragraphs stay separate', () => {
  assert.equal(toggleMarkdownEmphasis('  word  ', 'bold'), '  **word**  ');
  assert.equal(toggleMarkdownEmphasis('One\n\nTwo', 'italic'), '*One*\n\n*Two*');
  assert.equal(toggleMarkdownEmphasis('One  \nTwo', 'bold'), '**One  \nTwo**');
  assert.equal(toggleMarkdownEmphasis('  \n\n', 'bold'), '  \n\n');
});
