import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCards,previewGapTarget,previewDropTarget,insertPreviewCard,isPreviewShortcut} from '../dist/preview-view-v1.mjs';
import {moveBranch,depth,validState,exportMarkdown} from '../dist/model-v3.mjs';
import {dockBranch,restoreDockBranch} from '../dist/dock-v1.mjs';
import {serializeDocument,parseDocument} from '../dist/document-file-v1.mjs';
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

test('preview follows export order, includes folded children, and leaves folds and dock unchanged',()=>{
 const state=fixture(),before=JSON.stringify(state);
 assert.deepEqual(ids(state),['a','b','c','d','e']);
 assert.equal(JSON.stringify(state),before);
 assert.equal(exportMarkdown(state),'A\n\nB\n\nC\n\nD\n\nE\n\nParked\n\nParked child\n');
});

test('every insertion gap creates the exact requested reading position with a valid parent and column',()=>{
 for(const beforeId of ['a','b','c','d','e',null]){
  const state=fixture(),before=ids(state),index=beforeId===null?before.length:before.indexOf(beforeId);
  const following=state.cards.find(c=>c.id===(beforeId||'e'));
  const inserted=insertPreviewCard(state,beforeId);
  before.splice(index,0,inserted.id);
  assert.deepEqual(ids(state),before);
  assert.equal(inserted.parent,following.parent);assert.equal(depth(state,inserted),depth(state,following));
  assert(validState(state));assert(state.cards.find(c=>c.id==='a').collapsed);
 }
 const state=fixture(),before=JSON.stringify(state);
 assert.equal(insertPreviewCard(state,'missing'),null);assert.equal(insertPreviewCard(state,'park'),null);
 assert.equal(JSON.stringify(state),before);
});

test('moving a preview block carries descendants, preserves column gaps and folds, and reattaches beside the target',()=>{
 const state=fixture(),target=previewGapTarget(state,'e','b');
 assert(moveBranch(state,'b',target.parent,target.column,target.anchorId,target.before));
 assert.deepEqual(ids(state),['a','d','b','c','e']);
 assert.equal(state.cards.find(c=>c.id==='b').parent,null);
 assert.equal(state.cards.find(c=>c.id==='c').parent,'b');
 assert.equal(depth(state,state.cards.find(c=>c.id==='c')),2);
 assert(state.cards.find(c=>c.id==='b').collapsed);assert(validState(state));
 const nested=previewGapTarget(state,'d','b');
 assert(moveBranch(state,'b',nested.parent,nested.column,nested.anchorId,nested.before));
 assert.deepEqual(ids(state),['a','b','c','d','e']);assert(validState(state));
});

test('drops into the moving branch are rejected, and end gaps append after the final remaining card',()=>{
 const state=fixture(),before=JSON.stringify(state);
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
 assert.deepEqual(ids(state),['a','b','c','d']);
 const tail=insertPreviewCard(state);assert.equal(tail.parent,'a');
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
