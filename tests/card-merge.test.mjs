import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCard,planMerge} from '../dist/card-merge-v1.mjs';
import {depth,orderedCards,validState,exportMarkdown} from '../dist/model-v3.mjs';
const c=(id,parent=null,column=0)=>({id,parent,column,text:id});

test('Up and Down combine text and both child trees in visual order',()=>{
  for(const [id,key] of [['upper','ArrowDown'],['lower','ArrowUp']]){
    // Lower's child was created first, so array order differs from tree order.
    const state={title:'Merge',cards:[c('upper'),c('lower'),c('lc','lower',1),c('uc','upper',1),c('nested','lc',2)]};
    state.cards[2].collapsed=true;state.cards[0].collapsed=true;
    const before=JSON.parse(JSON.stringify(state));
    assert.deepEqual(mergeCard(state,id,key),{id:'upper'});
    assert.equal(state.cards[0].text,'upper\n\nlower');
    assert.deepEqual(orderedCards(state).map(c=>c.id),['upper','uc','lc','nested']);
    assert.equal(state.cards.find(c=>c.id==='lc').parent,'upper');
    assert.equal(state.cards.find(c=>c.id==='lc').collapsed,true);
    assert.equal(state.cards[0].collapsed,false);
    assert.deepEqual(state.cards.map(c=>depth(state,c)),[0,1,1,2]);
    assert.equal(state.cards.length,before.cards.length-1);
    assert(validState(state));
  }
});

test('vertical merges refuse crossing parent boundaries without mutation',()=>{
  const state={title:'Merge',cards:[c('a'),c('ac','a',1),c('b'),c('bc','b',1)]};
  const snapshot=JSON.stringify(state);
  assert.match(mergeCard(state,'ac','ArrowDown').error,/same parent/);
  assert.match(mergeCard(state,'bc','ArrowUp').error,/same parent/);
  assert.equal(JSON.stringify(state),snapshot);
});

test('Left and Right collapse a chain without losing descendants or export order',()=>{
  for(const [id,key] of [['parent','ArrowRight'],['child','ArrowLeft']]){
    const state={title:'Merge',cards:[c('parent'),c('child','parent',1),c('grand','child',2),c('deep','grand',4),c('other')]};
    state.cards[2].collapsed=true;
    const markdown=exportMarkdown(state);
    assert.deepEqual(mergeCard(state,id,key),{id:'parent'});
    assert.equal(state.cards.find(c=>c.id==='grand').parent,'parent');
    assert.deepEqual(state.cards.map(c=>depth(state,c)),[0,1,3,0]);
    assert.equal(state.cards.find(c=>c.id==='grand').collapsed,true);
    assert.equal(exportMarkdown(state),markdown);assert(validState(state));
  }
});

test('horizontal merges preserve relative spacing across skipped columns',()=>{
  const state={title:'Merge',cards:[c('a'),c('b','a',3),c('c','b',5)]};
  mergeCard(state,'b','ArrowLeft');
  assert.equal(depth(state,state.cards[1]),2);assert(validState(state));
});

test('folded, missing, and boundary targets refuse without mutation',()=>{
  const state={title:'Merge',cards:[c('a'),c('b','a',1),c('c','a',1)]};
  for(const [id,key] of [['a','ArrowUp'],['a','ArrowLeft'],['c','ArrowRight'],['missing','ArrowDown']]){
    const snapshot=JSON.stringify(state);
    assert(mergeCard(state,id,key).error);assert.equal(JSON.stringify(state),snapshot);
  }
  state.cards.splice(2,1);state.cards[0].collapsed=true;
  const snapshot=JSON.stringify(state);
  assert.match(planMerge(state,'a','ArrowRight').error,/Expand/);
  assert.equal(JSON.stringify(state),snapshot);
});

test('merging a middle child left replaces its slot with its children, leaving siblings intact',()=>{
  const state={title:'Merge',cards:[c('p'),c('before','p',1),c('selected','p',1),c('after','p',1),c('after-deep','after',2),c('g2','selected',2),c('g1','selected',2),c('deep','g2',4)]};
  state.cards.find(c=>c.id==='after').collapsed=true;
  const after=JSON.stringify(state.cards.filter(c=>['before','after','after-deep'].includes(c.id)));
  assert.deepEqual(mergeCard(state,'selected','ArrowLeft'),{id:'p'});
  assert.equal(state.cards[0].text,'p\n\nselected');
  assert.deepEqual(orderedCards(state).map(c=>c.id),['p','before','g2','deep','g1','after','after-deep']);
  assert.equal(JSON.stringify(state.cards.filter(c=>['before','after','after-deep'].includes(c.id))),after);
  assert.equal(depth(state,state.cards.find(c=>c.id==='deep')),3);
  assert(validState(state));
});

test('Right merges only the first child on a branch and retains its sibling',()=>{
  const state={title:'Merge',cards:[c('p'),c('first','p',1),c('second','p',1),c('grand','first',2)]};
  mergeCard(state,'p','ArrowRight');
  assert.equal(state.cards[0].text,'p\n\nfirst');
  assert.deepEqual(orderedCards(state).map(c=>c.id),['p','grand','second']);
  assert.deepEqual(state.cards.map(c=>depth(state,c)),[0,1,1]);assert(validState(state));
});

test('text joining preserves Markdown whitespace and avoids extra blank paragraphs',()=>{
  for(const [first,second,expected] of [
    ['', '  indented', '  indented'],['**First**','', '**First**'],
    ['First\n\n','Second','First\n\nSecond'],
    ['First\n','\nSecond','First\n\nSecond'],
    ['    code','    more','    code\n\n    more']
  ]){
    const state={title:'Merge',cards:[{...c('a'),text:first},{...c('b'),text:second}]};
    mergeCard(state,'a','ArrowDown');assert.equal(state.cards[0].text,expected);
  }
});
