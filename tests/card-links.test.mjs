import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { storeCardLinks, displayCardLinks, cardLinkTarget, isCardLink } from '../dist/card-links-v1.mjs';
import { moveCard, removeCard, splitCard } from '../dist/model-v3.mjs';
import { serializeDocument, parseDocument } from '../dist/document-file-v1.mjs';
import { expandAncestors, visibleCards } from '../dist/branch-view-v1.mjs';
const { marked } = createRequire(import.meta.url)('../dist/assets/marked.umd.js');
const lexer = text => marked.lexer(text, {gfm:true});
const document = () => ({title:'Links',cards:[
  {id:'a',parent:null,text:'First'}, {id:'b',parent:null,text:'Second'},
  {id:'c',parent:'b',text:'Child'}, {id:'d',parent:null,text:'Last'}
]});

test('numbers bind to permanent IDs and update for display after reordering', () => {
  const state=document(), text=storeCardLinks('[Read](3)',state,lexer);
  assert.equal(text,'[Read](#card-c)');
  moveCard(state,'b','a',true);
  assert.equal(cardLinkTarget(state,'#card-c'),'c');
  assert.equal(displayCardLinks(text,state,lexer),'[Read](2)');
  assert.equal(storeCardLinks(displayCardLinks(text,state,lexer),state,lexer),text);
});

test('only real inline links are rewritten, including lists, quotes, tables and emphasis', () => {
  const state=document();
  for(const text of ['[Read](2)', '**[Read](2)**', '- [Read](2)', '> [Read](2)', '| A |\n|---|\n| [Read](2) |', '[Read](<2> "title")']) {
    const expected=text.replace(/\(<2>/,'(#card-b').replace('(2)','(#card-b)');
    assert.equal(storeCardLinks(text,state,lexer),expected);
  }
  for(const text of ['`[Read](2)`','```md\n[Read](2)\n```','    [Read](2)','![Read](2)','\\[Read](2)','<a href="2">Read</a>','[Web](https://example.com/2)']) {
    assert.equal(storeCardLinks(text,state,lexer),text);
  }
  assert.equal(storeCardLinks('`[Read](2)` and [Read](2)',state,lexer),'`[Read](2)` and [Read](#card-b)');
  assert.equal(storeCardLinks('[Read]( 2 "title" )',state,lexer),'[Read]( #card-b "title" )');
});

test('missing or deleted targets never silently become another card', () => {
  const state=document(), text=storeCardLinks('[Read](2)',state,lexer);
  removeCard(state,'b');
  assert.equal(displayCardLinks(text,state,lexer),text);
  assert.equal(cardLinkTarget(state,'#card-b'),null);
  assert.equal(cardLinkTarget(state,'999'),null);
  assert.equal(cardLinkTarget(state,'0'),null);
  assert.equal(isCardLink('https://example.com/2'),false);
  assert.equal(isCardLink('02'),true);
});

test('saved documents and splits retain the same link identity', () => {
  const state=document();state.cards[0].text=storeCardLinks('[Read](3)',state,lexer);
  splitCard(state,'a','Intro',state.cards[0].text);
  const restored=parseDocument(serializeDocument(state)).state;
  assert.equal(restored.cards[1].text,'[Read](#card-c)');
  assert.equal(cardLinkTarget(restored,'#card-c'),'c');
});

test('navigation exposes descendants of collapsed branches', () => {
  const state=document();state.cards[1].collapsed=true;
  assert.equal(visibleCards(state).some(card=>card.id==='c'),false);
  assert.equal(expandAncestors(state,cardLinkTarget(state,'3')),true);
  assert.equal(visibleCards(state).some(card=>card.id==='c'),true);
});
