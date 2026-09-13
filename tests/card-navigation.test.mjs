import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationTarget } from '../dist/card-navigation-v1.mjs';
const fixture=()=>({cards:[
  {id:'a',parent:null,text:'A'},
  {id:'b',parent:'a',text:'B'},
  {id:'c',parent:'b',text:'C'},
  {id:'d',parent:'a',text:'D'},
  {id:'e',parent:null,text:'E'},
  {id:'f',parent:'e',text:'F'}
]});
test('vertical navigation follows visible column order across parent branches',()=>{
  const state=fixture();
  assert.equal(navigationTarget(state,'b','ArrowDown').id,'d');
  assert.equal(navigationTarget(state,'d','ArrowDown').id,'f');
  assert.equal(navigationTarget(state,'f','ArrowUp').id,'d');
  assert.equal(navigationTarget(state,'a','ArrowUp'),null);
  assert.equal(navigationTarget(state,'f','ArrowDown'),null);
});
test('vertical navigation skips folded descendants; right can open a folded child',()=>{
  const state=fixture();state.cards[0].collapsed=true;
  assert.equal(navigationTarget(state,'f','ArrowUp'),null);
  assert.equal(navigationTarget(state,'a','ArrowRight').id,'b');
  assert.equal(navigationTarget(state,'b','ArrowDown'),null);
});
test('horizontal navigation follows parent/child links across skipped columns',()=>{
  const state=fixture();state.cards[1].column=3;
  assert.equal(navigationTarget(state,'b','ArrowLeft').id,'a');
  assert.equal(navigationTarget(state,'a','ArrowRight').id,'b');
  assert.equal(navigationTarget(state,'b','ArrowDown'),null);
  assert.equal(navigationTarget(state,'a','ArrowLeft'),null);
  assert.equal(navigationTarget(state,'f','ArrowRight'),null);
  assert.equal(navigationTarget(state,'missing','ArrowDown'),null);
});
