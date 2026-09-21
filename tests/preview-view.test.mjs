import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCards,previewGapTarget,previewDropTarget,insertPreviewCard,isPreviewShortcut} from '../dist/preview-view-v1.mjs';
import {moveBranch,depth,validState,exportMarkdown,orderedCards} from '../dist/model-v3.mjs';
import {dockBranch,restoreDockBranch} from '../dist/dock-v1.mjs';
import {serializeDocument,parseDocument} from '../dist/document-file-v1.mjs';
import {visibleCards,toggleBranch,expandAncestors} from '../dist/branch-view-v1.mjs';
const fixture=()=>({title:'Preview',cards:[
 {id:'a',parent:null,column:0,text:'A',collapsed:true},
 {id:'b',parent:'a',column:1,text:'B',collapsed:true},
 {id:'c',parent:'b',column:3,text:'C'},
 {id:'d',parent:'a',column:1,text:'D'},
 {id:'e',parent:null,column:0,text:'E'},
 {id:'park',parent:null,column:0,text:'Parked',docked:true,collapsed:true},
 {id:'park-child',parent:'park',column:1,text:'Parked child'},
]});
const ids=s=>previewCards(s).map(c=>c.id);
const expandedFixture=()=>{const state=fixture();for(const card of state.cards)if(!card.docked)card.collapsed=false;return state;};

test('preview follows visible branch order, respects folds, and leaves export and dock unchanged',()=>{
 const state=fixture(),before=JSON.stringify(state);
 assert.deepEqual(ids(state),['a','e']);
 assert.deepEqual(previewCards(state),visibleCards(state));
 assert.equal(JSON.stringify(state),before);
 assert.equal(exportMarkdown(state),'A\n\nB\n\nC\n\nD\n\nE\n\nParked\n\nParked child\n');
});

test('every insertion gap creates the exact requested reading position with a valid parent and column',()=>{
 for(const beforeId of ['a','b','c','d','e',null]){
  const state=expandedFixture(),before=ids(state),index=beforeId===null?before.length:before.indexOf(beforeId);
  const following=state.cards.find(c=>c.id===(beforeId||'e'));
  const inserted=insertPreviewCard(state,beforeId);
  before.splice(index,0,inserted.id);
  assert.deepEqual(ids(state),before);
  assert.equal(inserted.parent,following.parent);assert.equal(depth(state,inserted),depth(state,following));
  assert(validState(state));assert.equal(state.cards.find(c=>c.id==='a').collapsed,false);
 }
 const state=fixture(),before=JSON.stringify(state);
 assert.equal(insertPreviewCard(state,'missing'),null);assert.equal(insertPreviewCard(state,'park'),null);
 assert.equal(JSON.stringify(state),before);
});

test('moving a preview block carries descendants, preserves column gaps and folds, and reattaches beside the target',()=>{
 const state=fixture();toggleBranch(state,'a');const target=previewGapTarget(state,'e','b');
 assert(moveBranch(state,'b',target.parent,target.column,target.anchorId,target.before));
 assert.deepEqual(ids(state),['a','d','b','e']);
 assert.equal(state.cards.find(c=>c.id==='b').parent,null);
 assert.equal(state.cards.find(c=>c.id==='c').parent,'b');
 assert.equal(depth(state,state.cards.find(c=>c.id==='c')),2);
 assert(state.cards.find(c=>c.id==='b').collapsed);assert(validState(state));
 const nested=previewGapTarget(state,'d','b');
 assert(moveBranch(state,'b',nested.parent,nested.column,nested.anchorId,nested.before));
 assert.deepEqual(ids(state),['a','b','d','e']);assert(validState(state));
});

test('drops into the moving branch are rejected, and end gaps append after the final remaining card',()=>{
 const state=expandedFixture(),before=JSON.stringify(state);
 for(const id of ['a','b','c','d'])assert.equal(previewGapTarget(state,id,'a'),null);
 assert.equal(JSON.stringify(state),before);
 const target=previewGapTarget(state,null,'b');
 assert(moveBranch(state,'b',target.parent,target.column,target.anchorId,target.before));
 assert.deepEqual(ids(state),['a','d','e','b','c']);assert(validState(state));
 const rects=new Map(ids(state).map((id,i)=>[id,{top:i*150,bottom:i*150+100}]));
 assert.equal(previewDropTarget(state,'b',0,rects).anchorId,'a');
 assert.equal(previewDropTarget(state,'b',475,rects),null);
});

test('dock transfers, blank canvases, and saved documents preserve preview order',()=>{
 const state=fixture();dockBranch(state,'a');dockBranch(state,'e');
 assert.deepEqual(ids(state),[]);
 const target=previewGapTarget(state,null,'a');assert(restoreDockBranch(state,'a',target));
 assert.deepEqual(ids(state),['a']);
 const tail=insertPreviewCard(state);assert.equal(tail.parent,null);
 assert.deepEqual(ids(parseDocument(serializeDocument(state)).state),ids(state));
 assert(validState(state));
 const empty=fixture();dockBranch(empty,'a');dockBranch(empty,'e');
 const first=insertPreviewCard(empty);assert.equal(first.parent,null);assert.deepEqual(ids(empty),[first.id]);
});

test('P is ignored in writing, titles, dialogs, modified shortcuts, and composition',()=>{
 const plain={key:'p',target:{}};
 assert(isPreviewShortcut(plain,{}));assert(isPreviewShortcut({...plain,key:'P'},{}));
 const editor={isContentEditable:true},title={closest:()=>({})};
 assert(!isPreviewShortcut({...plain,target:editor},{}));assert(!isPreviewShortcut(plain,title));
 assert(!isPreviewShortcut(plain,{},true));
 for(const flag of ['ctrlKey','metaKey','altKey','isComposing','repeat','defaultPrevented'])assert(!isPreviewShortcut({...plain,[flag]:true},{}));
});


test('preview toggles retain nested folds and persist the same state for both views',()=>{
 const state=fixture(),markdown=exportMarkdown(state);
 assert.equal(orderedCards(state,'a').length,3);
 toggleBranch(state,'a');assert.deepEqual(ids(state),['a','b','d','e']);
 toggleBranch(state,'b');assert.deepEqual(ids(state),['a','b','c','d','e']);
 toggleBranch(state,'a');assert.deepEqual(ids(state),['a','e']);
 toggleBranch(state,'a');assert.deepEqual(ids(state),['a','b','c','d','e']);
 toggleBranch(state,'b');
 const reopened=parseDocument(serializeDocument(state)).state;
 assert.deepEqual(ids(reopened),['a','b','d','e']);
 assert.deepEqual(previewCards(reopened),visibleCards(reopened));
 assert.equal(exportMarkdown(reopened),markdown);
 assert.equal(toggleBranch(state,'c'),false);
});

test('hidden cards are not insertion targets and gaps after folds remain visible',()=>{
 const state=fixture(),before=JSON.stringify(state);
 for(const id of ['b','c','d']){
  assert.equal(previewGapTarget(state,id),null);
  assert.equal(insertPreviewCard(state,id),null);
 }
 assert.equal(JSON.stringify(state),before);
 const inserted=insertPreviewCard(state,'e');
 assert.equal(inserted.parent,null);assert.deepEqual(ids(state),['a',inserted.id,'e']);
 assert(state.cards.find(c=>c.id==='a').collapsed);
 state.cards=state.cards.filter(c=>c.id!=='e'&&c.id!==inserted.id);
 const tail=insertPreviewCard(state);
 assert.equal(tail.parent,null);assert.deepEqual(ids(state),['a',tail.id]);
 assert(validState(state));
});

test('moving a folded branch carries hidden descendants and excludes them as drop targets',()=>{
 const state=fixture(),target=previewGapTarget(state,null,'a');
 assert(moveBranch(state,'a',target.parent,target.column,target.anchorId,target.before));
 assert.deepEqual(ids(state),['e','a']);
 assert.deepEqual(orderedCards(state,'a').map(c=>c.id),['b','c','d']);
 assert.equal(previewGapTarget(state,'b','a'),null);
 toggleBranch(state,'a');assert.deepEqual(ids(state),['e','a','b','d']);
 assert(validState(state));
});

test('revealing a hidden destination expands its ancestors in preview without losing other folds',()=>{
 const state=fixture();
 assert(expandAncestors(state,'d'));
 assert.deepEqual(ids(state),['a','b','d','e']);
 assert(state.cards.find(c=>c.id==='b').collapsed);
 assert(expandAncestors(state,'c'));
 assert.deepEqual(ids(state),['a','b','c','d','e']);
 assert.equal(expandAncestors(state,'c'),false);
});
