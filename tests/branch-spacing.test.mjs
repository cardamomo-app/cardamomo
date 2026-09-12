import test from 'node:test';
import assert from 'node:assert/strict';
import { createBranchSpacing, CARD_GAP, BRANCH_GAP } from '../dist/branch-spacing-v1.mjs';
const card=(id,parent=null,column)=>({id,parent,text:'',...(column===undefined?{}:{column})});

test('children of adjacent parents get room for both terminal plus buttons',()=>{
  const a=card('a'),b=card('b'),a1=card('a1','a'),a2=card('a2','a'),b1=card('b1','b');
  const gap=createBranchSpacing({cards:[a,a1,a2,b,b1]});
  assert.equal(gap(a,b),BRANCH_GAP);
  assert.equal(gap(a1,a2),CARD_GAP);
  assert(BRANCH_GAP-2*38-27>=16);
});

test('nested branches and skipped imported columns receive the same clearance',()=>{
  const root=card('root'),a=card('a','root'),b=card('b','root');
  const a1=card('a1','a',3),b1=card('b1','b',3);
  const gap=createBranchSpacing({cards:[root,a,a1,b,b1]});
  assert.equal(gap(a,b),BRANCH_GAP);
});

test('ordinary siblings and branches with no shared descendant column keep their spacing',()=>{
  const a=card('a'),b=card('b'),a1=card('a1','a',2),b1=card('b1','b',1);
  assert.equal(createBranchSpacing({cards:[a,b]})(a,b),CARD_GAP);
  assert.equal(createBranchSpacing({cards:[a,a1,b,b1]})(a,b),CARD_GAP);
});
