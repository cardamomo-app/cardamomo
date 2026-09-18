import test from 'node:test';
import assert from 'node:assert/strict';
import { dockBranch, dockRoot, restoreDockBranch } from '../dist/dock-v1.mjs';
import { depth, exportMarkdown, orderedCards, validState, moveCard } from '../dist/model-v3.mjs';
import { visibleCards } from '../dist/branch-view-v1.mjs';
import { parseDocument, serializeDocument } from '../dist/document-file-v1.mjs';
import { findDropTarget } from '../dist/drop-target-v1.mjs';
import { cardLinkTarget } from '../dist/card-links-v1.mjs';
const draft=()=>({title:'Dock',cards:[
  {id:'a',parent:null,text:'A'},
  {id:'b',parent:'a',text:'B',column:2},
  {id:'c',parent:'b',text:'C',column:4,collapsed:true},
  {id:'d',parent:'c',text:'D',column:5},
  {id:'e',parent:null,text:'E'},
]});

test('docking detaches and collapses the branch, keeping gaps, descendants, text and links',()=>{
  const state=draft();assert.equal(dockBranch(state,'b'),true);
  assert.deepEqual(visibleCards(state).map(c=>c.id),['a','e']);
  assert.equal(dockRoot(state,'d').id,'b');assert.equal(dockRoot(state,'a'),null);
  assert.equal(state.cards.find(c=>c.id==='b').collapsed,true);
  assert.equal(state.cards.find(c=>c.id==='c').collapsed,true);
  assert.equal(depth(state,state.cards.find(c=>c.id==='c')),2);
  assert.equal(cardLinkTarget(state,'#card-d'),'d');
  assert.equal(exportMarkdown(state),'A\n\nE\n\nB\n\nC\n\nD\n');
  assert.equal(validState(state),true);
});

test('restoring attaches all descendants at the chosen place, retaining nested folds',()=>{
  const state=draft();dockBranch(state,'b');
  assert.equal(restoreDockBranch(state,'b',{parent:'e',column:1,anchorId:null}),true);
  assert.equal(dockRoot(state,'d'),null);
  assert.equal(state.cards.find(c=>c.id==='b').parent,'e');
  assert.equal(state.cards.find(c=>c.id==='b').collapsed,true);
  assert.deepEqual(orderedCards(state).map(c=>c.id),['a','e','b','c','d']);
  assert.equal(depth(state,state.cards.find(c=>c.id==='d')),4);
});

test('a whole document can be parked and returned to an empty canvas',()=>{
  const state=draft();dockBranch(state,'a');dockBranch(state,'e');
  assert.deepEqual(visibleCards(state),[]);assert.equal(validState(state),true);
  const target=findDropTarget(state,'a',0,100,new Map());
  assert.equal(restoreDockBranch(state,'a',target),true);
  assert.deepEqual(visibleCards(state).map(c=>c.id),['a']);
  assert.equal(exportMarkdown(state),'A\n\nB\n\nC\n\nD\n\nE\n');
});

test('invalid restores and repeated docks do not mutate or lose a branch',()=>{
  const state=draft();dockBranch(state,'b');const saved=JSON.stringify(state);
  assert.equal(dockBranch(state,'b'),false);assert.equal(dockBranch(state,'d'),false);
  assert.equal(restoreDockBranch(state,'b',{parent:'d',column:6}),false);
  assert.equal(restoreDockBranch(state,'b',{parent:null,column:-1}),false);
  assert.equal(restoreDockBranch(state,'c',{parent:null,column:0}),false);
  assert.equal(JSON.stringify(state),saved);
});

test('saving and reopening preserves dock state; older documents still open',()=>{
  const state=draft();dockBranch(state,'a');
  const source=serializeDocument(state,{zoom:.8});
  assert.equal(JSON.parse(source).version,2);
  assert.deepEqual(parseDocument(source).state,state);
  const previous=draft();assert.equal(JSON.parse(serializeDocument(previous)).version,1);
  assert.deepEqual(parseDocument(serializeDocument(previous)).state,previous);
  const corrupt=JSON.parse(source);corrupt.document.cards.find(c=>c.id==='b').docked=true;
  assert.throws(()=>parseDocument(JSON.stringify(corrupt)),/invalid/);
  assert.equal(validState(corrupt.document),false);
});

test('main reordering leaves dock branches intact and exports them last in docking order',()=>{
  const state=draft();dockBranch(state,'b');moveCard(state,'e','a',true);
  assert.equal(exportMarkdown(state),'E\n\nA\n\nB\n\nC\n\nD\n');
  const snapshot=JSON.stringify(state);restoreDockBranch(state,'b',{parent:null,column:0,anchorId:'a',before:true});
  const undo=JSON.parse(snapshot);assert.equal(dockRoot(undo,'d').id,'b');
  assert.equal(exportMarkdown(undo),'E\n\nA\n\nB\n\nC\n\nD\n');
});
