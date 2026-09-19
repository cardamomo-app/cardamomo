import test from 'node:test';
import assert from 'node:assert/strict';
import {depth,moveBranch,moveCard,orderedCards,splitCard,validState,exportMarkdown} from '../dist/model-v3.mjs';
import {findDropTarget} from '../dist/drop-target-v1.mjs';
const card=(id,parent=null,column=0)=>({id,parent,column,text:id});
const fixture=()=>({title:'Tree',cards:[card('a'),card('b','a',1),card('c','b',3),card('d'),card('e','d',1)]});

test('moving across columns shifts every descendant and preserves skipped levels',()=>{
 const s=fixture();assert(moveCard(s,'b','d',true));
 assert.equal(s.cards.find(c=>c.id==='b').parent,null);
 assert.deepEqual(['b','c'].map(id=>depth(s,s.cards.find(c=>c.id===id))),[0,2]);
 assert.deepEqual(orderedCards(s).map(c=>c.id),['a','b','c','d','e']);
 assert(moveBranch(s,'b','e',2));
 assert.deepEqual(['b','c'].map(id=>depth(s,s.cards.find(c=>c.id===id))),[2,4]);
 assert.equal(s.cards.find(c=>c.id==='c').parent,'b');assert(validState(s));
 assert.equal(exportMarkdown(s),'a\n\nd\n\ne\n\nb\n\nc\n');
});

test('branch drops reject cycles and invalid parents without changing writing',()=>{
 const s=fixture(),before=JSON.stringify(s);
 assert.equal(moveBranch(s,'a','c',4),false);
 assert.equal(moveCard(s,'a','c',true),false);
 assert.equal(moveBranch(s,'b','missing',2),false);
 assert.equal(moveBranch(s,'b','e',0),false);
 assert.equal(moveBranch(s,'b',null,0,'e'),false);
 assert.equal(JSON.stringify(s),before);
});

test('same-column reorder retains the whole branch and its sibling ordering',()=>{
 const s=fixture();assert(moveCard(s,'b','e',false));
 assert.deepEqual(orderedCards(s).map(c=>c.id),['a','d','e','b','c']);
 assert.deepEqual(['b','c'].map(id=>depth(s,s.cards.find(c=>c.id===id))),[1,3]);
 assert(validState(s));
});

test('split inserts a same-column sibling and leaves children on the original',()=>{
 const s=fixture(),b=s.cards.find(c=>c.id==='b');
 b.text='First\n\nSecond';const next=splitCard(s,'b','First','Second');
 assert.equal(next.parent,'a');assert.equal(depth(s,next),1);
 assert.deepEqual(orderedCards(s).map(c=>c.id),['a','b','c',next.id,'d','e']);
 assert.equal(s.cards.find(c=>c.id==='c').parent,'b');assert.equal(b.text,'First');assert.equal(next.text,'Second');
 const atStart=splitCard(s,next.id,'','Second');assert.equal(next.text,'');assert.equal(atStart.text,'Second');assert(validState(s));
});

test('drop targeting supports existing columns, empty next columns, and excludes descendants',()=>{
 const s=fixture(),rects=new Map([['a',{top:100,bottom:300}],['b',{top:100,bottom:300}],['c',{top:100,bottom:300}],['d',{top:500,bottom:700}],['e',{top:500,bottom:700}]]);
 assert.equal(findDropTarget(s,'b',0,550,rects).anchorId,'d');
 assert.deepEqual(findDropTarget(s,'b',2,550,rects),{parent:'e',column:2,anchorId:null,highlightId:'e',mode:'child'});
 assert.equal(findDropTarget(s,'a',3,150,rects),null);
});


test('split to the right creates a first child without moving existing branches',()=>{
 const s=fixture(),b=s.cards.find(c=>c.id==='b'),c=s.cards.find(c=>c.id==='c');
 b.text='First\n\nSecond';b.collapsed=true;c.collapsed=true;
 const existing=structuredClone(c);
 const next=splitCard(s,'b','First','Second','right');
 assert.equal(next.parent,'b');assert.equal(depth(s,next),2);
 assert.equal(next.text,'Second');assert.equal(b.text,'First');
 assert.deepEqual(c,existing);
 assert.deepEqual(orderedCards(s).map(c=>c.id),['a','b',next.id,'c','d','e']);
 assert.equal(exportMarkdown(s),'a\n\nFirst\n\nSecond\n\nc\n\nd\n\ne\n');
 assert(validState(s));
});

test('first-child splitting works after parent reordering and at text boundaries',()=>{
 const s=fixture();
 assert(moveBranch(s,'a',null,0,'d',false));
 const next=splitCard(s,'a','','All the text','right');
 assert.deepEqual(orderedCards(s,'a').map(c=>c.id),[next.id,'b','c']);
 assert.equal(s.cards.find(c=>c.id==='a').text,'');
 const empty=splitCard(s,next.id,'All the text','','right');
 assert.equal(empty.parent,next.id);assert.equal(empty.text,'');assert.equal(depth(s,empty),2);
 assert(validState(s));
 const before=JSON.stringify(s);
 assert.equal(splitCard(s,'missing','a','b','right'),null);
 assert.equal(splitCard(s,'a','a','b','left'),null);
 assert.equal(JSON.stringify(s),before);
});
