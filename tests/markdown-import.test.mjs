import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { importMarkdown } from '../dist/markdown-import-v2.mjs';
import { depth, exportMarkdown, validState, addCard, moveCard, removeCard } from '../dist/model-v3.mjs';
const { marked } = createRequire(import.meta.url)('../dist/assets/marked.umd.js');
const parse = text => importMarkdown(text, 'My draft.md', input => marked.lexer(input, { gfm: true }));

test('each heading starts a card, with repeated H3 headings stacked under their H2', () => {
  const markdown = '# Book\n\nOverview\n\n## Chapter\n\nOpening\n\n### Scene one\n\nFirst scene\n\n### Scene two\n\nSecond scene\n\n## Next chapter\n\nMore text\n';
  const state = parse(markdown);
  assert.equal(state.title, 'My draft');
  assert.deepEqual(state.cards.map(c => depth(state,c)), [0,1,2,2,1]);
  assert.equal(state.cards[2].parent,state.cards[1].id);
  assert.equal(state.cards[3].parent,state.cards[1].id);
  assert.equal(exportMarkdown(state),markdown);
  assert(validState(state));
});

test('the highest heading level present is column one and missing levels are compressed', () => {
  const state = parse('## A\n\n#### B\n\n#### C\n\n## D');
  assert.deepEqual(state.cards.map(c=>depth(state,c)),[0,1,1,0]);
});

test('a skipped parent does not put two different heading levels in the same column', () => {
  const state = parse('# A\n\n### Early H3\n\n## H2\n\n### Later H3');
  assert.deepEqual(state.cards.map(c=>depth(state,c)),[0,2,1,2]);
  assert.equal(state.cards[1].parent,state.cards[0].id);
  assert.equal(state.cards[3].parent,state.cards[2].id);
});

test('code fences, indented code, and quoted headings do not split into cards', () => {
  const markdown = '# A\n\n```md\n# Fenced heading\n```\n\n    ## Indented code\n\n> # Quoted heading\n\n## B\n';
  const state = parse(markdown);
  assert.equal(state.cards.length,2);
  assert.equal(exportMarkdown(state),markdown);
});

test('setext headings, introductory text, and reference definitions are preserved', () => {
  const markdown = 'Introduction\n\nTitle\n=====\n\nText [reference][ref].\n\n[ref]: https://example.com\n\nSubtitle\n--------\n\nBody\n';
  const state = parse(markdown);
  assert.equal(state.cards.length,3);
  assert.deepEqual(state.cards.map(c=>depth(state,c)),[0,0,1]);
  assert.equal(exportMarkdown(state),markdown);
});

test('plain text, blank files, Windows line endings, and UTF-8 BOM are accepted', () => {
  assert.equal(parse('No headings.\nAnother line.').cards.length,1);
  assert.equal(parse('').cards[0].text,'');
  assert.equal(exportMarkdown(parse('\uFEFF# A\r\n\r\n## B\r\n')),'# A\n\n## B\n');
  assert.throws(()=>parse('binary\0data'),/text file/);
});

test('imported columns support adding, moving, and removing cards', () => {
  const state = parse('# A\n\n### Early H3\n\n## H2\n\n### Later H3');
  const early=state.cards[1],later=state.cards[3];
  const sibling=addCard(state,early.id,'after');
  assert.equal(depth(state,sibling),2);
  assert(moveCard(state,sibling.id,later.id,true));
  assert.equal(sibling.parent,later.parent);
  const child=addCard(state,later.id,'right');
  assert.equal(depth(state,child),3);
  removeCard(state,later.id);
  assert.equal(depth(state,child),2);
  assert(validState(state));
});
