import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleCards,toggleBranch,expandAncestors} from '../dist/branch-view-v1.mjs';
import {exportMarkdown,moveBranch,depth,validState} from '../dist/model-v3.mjs';
const fixture=()=>({title:'Tree',cards:[
  {id:'a',parent:null,text:'A'},
  {id:'b',parent:'a',text:'B'},
  {id:'c',parent:'b',text:'C'},
  {id:'d',parent:'a',text:'D'},
  {id:'e',parent:null,text:'E'}
]});
const visible=s=>visibleCards(s).map(c=>c.id);

test('folding hides only descendants and leaves all writing and export intact',()=>{
  const s=fixture(),markdown=exportMarkdown(s);
  assert(toggleBranch(s,'a'));assert.deepEqual(visible(s),['a','e']);
  assert.equal(exportMarkdown(s),markdown);assert.equal(s.cards.length,5);
  assert(toggleBranch(s,'a'));assert.deepEqual(visible(s),['a','b','c','d','e']);
  assert.deepEqual(s.cards.map(({collapsed,...c})=>c),fixture().cards);
});

test('nested folds survive ancestor expansion and saving',()=>{
  const s=fixture();toggleBranch(s,'b');toggleBranch(s,'a');
  const restored=JSON.parse(JSON.stringify(s));toggleBranch(restored,'a');
  assert.deepEqual(visible(restored),['a','b','d','e']);
  toggleBranch(restored,'b');assert.deepEqual(visible(restored),['a','b','c','d','e']);
  assert(validState(restored));
});

test('moving a folded branch preserves hidden descendants and their fold state',()=>{
  const s=fixture();toggleBranch(s,'a');assert(moveBranch(s,'a','e',1));
  assert.deepEqual(visible(s),['e','a']);
  toggleBranch(s,'a');assert.deepEqual(visible(s),['e','a','b','c','d']);
  assert.equal(depth(s,s.cards.find(c=>c.id==='c')),3);assert(validState(s));
});

test('opening a hidden card expands its ancestors without unfolding unrelated branches',()=>{
  const s=fixture();toggleBranch(s,'b');toggleBranch(s,'a');
  assert(expandAncestors(s,'d'));assert.deepEqual(visible(s),['a','b','d','e']);
  assert(expandAncestors(s,'c'));assert.deepEqual(visible(s),['a','b','c','d','e']);
  assert.equal(toggleBranch(s,'c'),false);assert.equal(toggleBranch(s,'missing'),false);
  assert.equal(expandAncestors(s,'missing'),false);
});
