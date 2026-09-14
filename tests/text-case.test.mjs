import test from 'node:test';
import assert from 'node:assert/strict';
import { changeTextCase, nextTextCase } from '../dist/text-case-v1.mjs';

test('cycles through all four cases and back from recognized text', () => {
  let result = nextTextCase('hello world. another sentence!');
  assert.deepEqual(result, { mode: 1, text: 'HELLO WORLD. ANOTHER SENTENCE!' });
  result = nextTextCase(result.text, result.mode);
  assert.deepEqual(result, { mode: 2, text: 'Hello world. Another sentence!' });
  result = nextTextCase(result.text, result.mode);
  assert.deepEqual(result, { mode: 3, text: 'Hello World. Another Sentence!' });
  assert.deepEqual(nextTextCase(result.text, result.mode), { mode: 0, text: 'hello world. another sentence!' });
});

test('mixed case starts at lowercase and existing sentence/word case advances', () => {
  assert.deepEqual(nextTextCase('hELLo WORLD'), { mode: 0, text: 'hello world' });
  assert.deepEqual(nextTextCase('Hello world'), { mode: 3, text: 'Hello World' });
  assert.deepEqual(nextTextCase('Hello World'), { mode: 0, text: 'hello world' });
});

test('identical single-word appearances still progress through each step', () => {
  assert.deepEqual(nextTextCase('Hello', 2), { mode: 3, text: 'Hello' });
  assert.deepEqual(nextTextCase('Hello', 3), { mode: 0, text: 'hello' });
});

test('sentence case handles punctuation, quotations, and paragraph boundaries', () => {
  assert.equal(changeTextCase('“HELLO.” HOW ARE YOU? GREAT!\n\n**ANOTHER** PARAGRAPH.', 2),
    '“Hello.” How are you? Great!\n\n**Another** paragraph.');
});

test('word case supports accents, apostrophes, and hyphenated words', () => {
  assert.equal(changeTextCase("ÉLAN DON'T STOP. L’AMOUR AND WELL-BEING", 3), "Élan Don't Stop. L’amour And Well-Being");
  assert.equal(changeTextCase('straße café', 1), 'STRASSE CAFÉ');
});

test('whitespace, Markdown delimiters, and hard breaks are preserved', () => {
  assert.equal(changeTextCase('  **HELLO**  \nWORLD\n\n*AGAIN*  ', 0), '  **hello**  \nworld\n\n*again*  ');
  assert.equal(nextTextCase(' 123 — !\n\n'), null);
});
