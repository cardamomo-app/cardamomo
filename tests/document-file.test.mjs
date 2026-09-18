import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serializeDocument, parseDocument, openDocument } from '../dist/document-file-v1.mjs';
import { depth, exportMarkdown } from '../dist/model-v3.mjs';
const { marked } = createRequire(import.meta.url)('../dist/assets/marked.umd.js');
const state = {
  title: 'A portable draft 🌿',
  cards: [
    { id: 'root', parent: null, text: 'A paragraph.\n\nNo heading.', collapsed: true },
    { id: 'later', parent: null, text: 'Next root', column: 0 },
    { id: 'child', parent: 'root', text: 'A headingless child.  \nHard break.\n', column: 2, collapsed: true },
    { id: 'empty', parent: 'child', text: '', column: 4 },
    { id: 'sibling', parent: 'root', text: '**Another child**', column: 2, collapsed: false },
  ],
};
const view = { zoom: 1.2, scrollLeft: 487.5, scrollTop: 203 };

test('Cardamomo round trip preserves every card, order, connection, column, fold, text, and view', () => {
  const before = structuredClone(state);
  const restored = parseDocument(serializeDocument(state, view));
  assert.deepEqual(restored, { state, view });
  assert.deepEqual(state, before);
  assert.deepEqual(restored.state.cards.map(c => depth(restored.state, c)), [0, 0, 2, 4, 2]);
  assert.equal(exportMarkdown(restored.state), exportMarkdown(state));
});

test('a completely blank draft can be saved and reopened', () => {
  const blank = { title: 'Untitled', cards: [{ id: 'blank', parent: null, text: '' }] };
  assert.deepEqual(parseDocument(serializeDocument(blank)).state, blank);
});

test('open recognizes Cardamomo extension case-insensitively and keeps the embedded title', () => {
  const result = openDocument('\uFEFF' + serializeDocument(state, view), 'Renamed.CARDAMOMO', () => { throw Error('Must not parse as Markdown'); });
  assert.deepEqual(result, { state, view });
});

test('Markdown still imports by headings, including headingless paragraphs in their preceding card', () => {
  const result = openDocument('# Parent\n\nParagraph one.\n\nParagraph two.\n\n## Child\n\nBody.', 'Writing.md', marked.lexer);
  assert.equal(result.state.title, 'Writing');
  assert.equal(result.state.cards.length, 2);
  assert.equal(result.state.cards[1].parent, result.state.cards[0].id);
  assert.match(result.state.cards[0].text, /Paragraph two/);
  assert.deepEqual(result.view, { zoom: 1, scrollLeft: 0, scrollTop: 0 });
});

test('unsupported versions and malformed documents produce clear errors', () => {
  const file = JSON.parse(serializeDocument(state));
  assert.throws(() => parseDocument('not JSON'), /damaged or invalid/);
  assert.throws(() => parseDocument(JSON.stringify({ ...file, version: 3 })), /unsupported version/);
  assert.throws(() => parseDocument(JSON.stringify({ ...file, format: 'other' })), /damaged or invalid/);
  for (const cards of [[], [null], [{ id: 'bad"id', parent: null, text: '' }],
    [{ id: 'a', parent: null, text: '', collapsed: 'yes' }],
    [{ id: 'a', parent: 'missing', text: '' }],
    [{ id: 'a', parent: 'a', text: '' }],
    [{ id: 'a', parent: 'b', text: '' }, { id: 'b', parent: 'a', text: '' }],
    [{ id: 'a', parent: null, text: '' }, { id: 'a', parent: null, text: '' }],
    [{ id: 'a', parent: null, text: '', column: -1 }]]) {
    assert.throws(() => parseDocument(JSON.stringify({ ...file, document: { title: 'Bad', cards } })), /damaged or invalid/);
  }
  assert.throws(() => parseDocument(JSON.stringify({ ...file, view: { zoom: 0 } })), /damaged or invalid/);
  assert.throws(() => parseDocument(JSON.stringify({ ...file, view: { scrollTop: -2 } })), /damaged or invalid/);
});

test('unknown fields are ignored and missing optional view metadata uses defaults', () => {
  const file = JSON.parse(serializeDocument(state));
  delete file.view;
  file.document.cards[0].html = '<script>untrusted</script>';
  assert.deepEqual(parseDocument(JSON.stringify(file)), { state, view: { zoom: 1, scrollLeft: 0, scrollTop: 0 } });
});
