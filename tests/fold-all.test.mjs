import test from 'node:test';
import assert from 'node:assert/strict';
import {foldAllAction,toggleAllBranches,isFoldAllShortcut} from '../dist/fold-all-v1.mjs';
import {visibleCards} from '../dist/branch-view-v1.mjs';
import {previewCards} from '../dist/preview-view-v1.mjs';
import {exportMarkdown,validState} from '../dist/model-v3.mjs';
import {serializeDocument,parseDocument} from '../dist/document-file-v1.mjs';

const fixture=()=>({title:'Folds',cards:[
 {id:'a',parent:null,text:'A'},
 {id:'b',parent:'a',text:'B'},
 {id:'c',parent:'b',text:'C'},
 {id:'d',parent:'a',text:'D'},
 {id:'e',parent:null,text:'E'},
 {id:'f',parent:'e',text:'F'},
 {id:'park',parent:null,text:'Parked',docked:true,collapsed:true},
 {id:'park-b',parent:'park',text:'Parked branch',collapsed:false},
 {id:'park-c',parent:'park-b',text:'Parked child'},
]});
const ids=state=>previewCards(state).map(card=>card.id);

test('all-cards toggle collapses every canvas branch, then expands every nested level in both views',()=>{
 const state=fixture(),markdown=exportMarkdown(state),before=structuredClone(state);
 assert.equal(foldAllAction(state),'collapse');assert(toggleAllBranches(state));
 assert.deepEqual(ids(state),['a','e']);assert.deepEqual(previewCards(state),visibleCards(state));
 for(const id of ['a','b','e'])assert.equal(state.cards.find(c=>c.id===id).collapsed,true);
 assert.equal(foldAllAction(state),'expand');assert(toggleAllBranches(state));
 assert.deepEqual(ids(state),['a','b','c','d','e','f']);
 assert.deepEqual(previewCards(state),visibleCards(state));
 assert.equal(foldAllAction(state),'collapse');assert.equal(exportMarkdown(state),markdown);
 assert.deepEqual(state.cards.map(({collapsed,...card})=>card),before.cards.map(({collapsed,...card})=>card));
 assert(validState(state));
});

test('a mixture of open and closed branches expands all and persists across saving',()=>{
 const state=fixture();state.cards.find(c=>c.id==='b').collapsed=true;
 assert.equal(foldAllAction(state),'expand');toggleAllBranches(state);
 assert.deepEqual(ids(state),['a','b','c','d','e','f']);
 toggleAllBranches(state);
 const restored=parseDocument(serializeDocument(state)).state;
 assert.deepEqual(ids(restored),['a','e']);assert.equal(foldAllAction(restored),'expand');
 assert.deepEqual(previewCards(restored),visibleCards(restored));
});

test('parked branches and leaf state are untouched; empty and leaf-only canvases have no action',()=>{
 const state=fixture(),parked=structuredClone(state.cards.slice(6)),leaf=structuredClone(state.cards[2]);
 toggleAllBranches(state);toggleAllBranches(state);
 assert.deepEqual(state.cards.slice(6),parked);assert.deepEqual(state.cards[2],leaf);
 for(const cards of [[],[{id:'leaf',parent:null,text:'Leaf',collapsed:true}],parked]){
  const empty={title:'Empty',cards},before=JSON.stringify(empty);
  assert.equal(foldAllAction(empty),null);assert.equal(toggleAllBranches(empty),false);
  assert.equal(JSON.stringify(empty),before);
 }
});

test('C shortcut leaves writing, titles, forms, dialogs, and command shortcuts alone',()=>{
 const plain={key:'c',target:{}};
 assert(isFoldAllShortcut(plain,{}));assert(isFoldAllShortcut({...plain,key:'C',shiftKey:true},{}));
 assert(!isFoldAllShortcut({...plain,key:'p'},{}));
 for(const editable of [{isContentEditable:true},{closest:()=>({})}]){
  assert(!isFoldAllShortcut({...plain,target:editable},{}));
  assert(!isFoldAllShortcut(plain,editable));
 }
 assert(!isFoldAllShortcut(plain,{},true));
 for(const flag of ['ctrlKey','metaKey','altKey','isComposing','repeat','defaultPrevented'])assert(!isFoldAllShortcut({...plain,[flag]:true},{}));
});
