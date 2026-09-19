import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { highlightExtension, toggleMarkdownHighlight, surroundingHighlight } from '../dist/highlight-v1.mjs';
import { storeCardLinks, displayCardLinks } from '../dist/card-links-v1.mjs';
import { serializeDocument, parseDocument } from '../dist/document-file-v1.mjs';
import { exportMarkdown } from '../dist/model-v3.mjs';
const { Marked } = createRequire(import.meta.url)('../dist/assets/marked.umd.js');
const parser = new Marked(highlightExtension);

test('highlight renders inline with emphasis, links, headings, lists, and repeated spans', () => {
  assert.equal(parser.parse('A ==highlight== here.'), '<p>A <mark>highlight</mark> here.</p>\n');
  assert.equal(parser.parse('==**bold** and *italic*=='), '<p><mark><strong>bold</strong> and <em>italic</em></mark></p>\n');
  assert.equal(parser.parse('**==both==**'), '<p><strong><mark>both</mark></strong></p>\n');
  assert.equal(parser.parse('==[link](https://example.com)=='), '<p><mark><a href="https://example.com">link</a></mark></p>\n');
  assert.match(parser.parse('# ==Heading==\n\n- ==One== and ==two=='), /<h1><mark>Heading<\/mark><\/h1>/);
  assert.equal((parser.parse('==one== ==two==').match(/<mark>/g)||[]).length, 2);
});

test('code, escaped markers, unfinished pairs, and ordinary equals remain literal', () => {
  for (const source of ['`==word==`', '```\n==word==\n```', '\\==word==', '===word===', '====', '==unfinished', '== space ==', '==one\n\ntwo==', 'a == b', 'x === y']) {
    assert(!parser.parse(source).includes('<mark>'), source);
  }
  assert.equal(parser.parse('==a `==` b=='), '<p><mark>a <code>==</code> b</mark></p>\n');
  assert.equal(parser.parse('==a \\== b=='), '<p><mark>a == b</mark></p>\n');
});

test('shortcut highlighting toggles and preserves whitespace, paragraphs, and nested styles', () => {
  for (const text of ['word', '**bold**', '*italic*', '[link](2)', '  word  ', 'one\n\ntwo', 'one\nline']) {
    assert.equal(toggleMarkdownHighlight(toggleMarkdownHighlight(text)), text);
  }
  assert.equal(toggleMarkdownHighlight('  word  '), '  ==word==  ');
  assert.equal(toggleMarkdownHighlight('one\n\ntwo'), '==one==\n\n==two==');
  assert.equal(toggleMarkdownHighlight('  \n\n'), '  \n\n');
  assert.deepEqual(surroundingHighlight('Before ==', 'word', '== after'), {left:'==',right:'=='});
  assert.deepEqual(surroundingHighlight('Before **==', 'word', '==**'), {left:'==',right:'=='});
  assert.deepEqual(surroundingHighlight('Before \\==', 'word', '== after'), {left:'',right:''});
});

test('highlighted internal links and document text survive save, export, and reopening', () => {
  const state = {title:'Highlights',cards:[{id:'a',parent:null,text:'==[Read](2)=='},{id:'b',parent:null,text:'Second'}]};
  const lexer = text => parser.lexer(text);
  state.cards[0].text = storeCardLinks(state.cards[0].text,state,lexer);
  assert.equal(state.cards[0].text,'==[Read](#card-b)==');
  assert.equal(displayCardLinks(state.cards[0].text,state,lexer),'==[Read](2)==');
  const reopened = parseDocument(serializeDocument(state)).state;
  assert.equal(exportMarkdown(reopened),'==[Read](#card-b)==\n\nSecond\n');
  assert.match(parser.parse(reopened.cards[0].text),/<mark><a href="#card-b">Read<\/a><\/mark>/);
});
