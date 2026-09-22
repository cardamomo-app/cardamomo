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
  assert.equal(changeTextCase("ÉLAN DON'T STOP. L’AMOUR AND WELL-BEING", 3), "Élan Don't Stop. L’amour and Well-Being");
  assert.equal(changeTextCase('straße café', 1), 'STRASSE CAFÉ');
});

test('whitespace, Markdown delimiters, and hard breaks are preserved', () => {
  assert.equal(changeTextCase('  **HELLO**  \nWORLD\n\n*AGAIN*  ', 0), '  **hello**  \nworld\n\n*again*  ');
  assert.equal(nextTextCase(' 123 — !\n\n'), null);
});


test('word case leaves common connecting words lowercase inside the selection', () => {
  assert.equal(changeTextCase('THE LORD OF THE RINGS AND THE HOBBIT', 3), 'The Lord of the Rings and the Hobbit');
  assert.equal(changeTextCase('a walk in the woods with a friend', 3), 'A Walk in the Woods with a Friend');
  assert.equal(changeTextCase('for you and me to live by', 3), 'For You and Me to Live By');
  assert.equal(changeTextCase('and', 3), 'And');
  assert.equal(changeTextCase('candy often theory origin', 3), 'Candy Often Theory Origin');
});

test('connecting-word casing preserves Markdown, whitespace, and hyphenated compounds', () => {
  assert.equal(changeTextCase('  **THE** ART OF *THE* POSSIBLE  ', 3), '  **The** Art of *the* Possible  ');
  assert.equal(changeTextCase('STATE-OF-THE-ART DESIGN', 3), 'State-of-the-Art Design');
  assert.equal(changeTextCase('bread  AND\nBUTTER', 3), 'Bread  and\nButter');
  assert.equal(changeTextCase('  — 123 ', 3), '  — 123 ');
});

test('the cycle recognizes word case containing lowercase connectors', () => {
  const title = 'The Lord of the Rings';
  assert.deepEqual(nextTextCase('The lord of the rings', 2), {mode: 3, text: title});
  assert.deepEqual(nextTextCase(title), {mode: 0, text: 'the lord of the rings'});
  assert.deepEqual(nextTextCase(title, 3), {mode: 0, text: 'the lord of the rings'});
});
