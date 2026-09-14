import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleMarkdownEmphasis, surroundingEmphasis } from '../dist/formatting-v1.mjs';

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

test('underscore and nested emphasis toggle independently', () => {
  assert.equal(toggleMarkdownEmphasis('__word__', 'bold'), 'word');
  assert.equal(toggleMarkdownEmphasis('_word_', 'italic'), 'word');
  assert.equal(toggleMarkdownEmphasis('___word___', 'bold'), '*word*');
  assert.equal(toggleMarkdownEmphasis('**_word_**', 'italic'), '**word**');
  assert.equal(toggleMarkdownEmphasis('_**word**_', 'bold'), '*word*');
});

test('recognizes markers surrounding a selected word without consuming unrelated text', () => {
  assert.deepEqual(surroundingEmphasis('Before **', 'word', '** after'), { left: '**', right: '**' });
  assert.deepEqual(surroundingEmphasis('Before ***', 'word', '*** after'), { left: '***', right: '***' });
  assert.deepEqual(surroundingEmphasis('Before **_', 'word', '_** after'), { left: '**_', right: '_**' });
  assert.deepEqual(surroundingEmphasis('Before \\*', 'word', '* after'), { left: '', right: '' });
  assert.deepEqual(surroundingEmphasis('Before *', 'word', '** after'), { left: '', right: '' });
  assert.deepEqual(surroundingEmphasis('Before ', 'word', ' after'), { left: '', right: '' });
});

test('selection whitespace stays outside delimiters and paragraphs stay separate', () => {
  assert.equal(toggleMarkdownEmphasis('  word  ', 'bold'), '  **word**  ');
  assert.equal(toggleMarkdownEmphasis('One\n\nTwo', 'italic'), '*One*\n\n*Two*');
  assert.equal(toggleMarkdownEmphasis('One  \nTwo', 'bold'), '**One  \nTwo**');
  assert.equal(toggleMarkdownEmphasis('  \n\n', 'bold'), '  \n\n');
});
