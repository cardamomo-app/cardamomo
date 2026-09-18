import { depth, orderedCards, siblings } from './model-v3.mjs?v=dock1';
import { navigationTarget } from './card-navigation-v1.mjs?v=dock1';

// Inspect first: a refused merge must not change content, folds, or history.
export function planMerge(state,id,key){
  const card=state.cards.find(c=>c.id===id);
  if(!card)return {error:'Choose a card to merge.'};
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))return {error:'Choose a merge direction.'};
  const target=navigationTarget(state,id,key);
  if(!target)return {error:'There is no card to merge in that direction.'};
  if(key==='ArrowUp'||key==='ArrowDown'){
    if(card.parent!==target.parent)return {error:'Merge above/below only works for cards with the same parent.'};
    const upper=key==='ArrowUp'?target:card,lower=key==='ArrowUp'?card:target;
    return {kind:'vertical',keepId:upper.id,removeId:lower.id};
  }
  const parent=key==='ArrowLeft'?target:card,child=key==='ArrowLeft'?card:target;
  if(parent.collapsed)return {error:'Expand the branch before merging its child.'};
  return {kind:'horizontal',keepId:parent.id,removeId:child.id};
}

function joinMarkdown(first,second){
  if(!first)return second;
  if(!second)return first;
  const boundary=(first.match(/\n*$/)[0].length)+(second.match(/^\n*/)[0].length);
  return first+'\n'.repeat(Math.max(0,2-boundary))+second;
}

export function mergeCard(state,id,key){
  const plan=planMerge(state,id,key);
  if(plan.error)return plan;
  const keep=state.cards.find(c=>c.id===plan.keepId),removed=state.cards.find(c=>c.id===plan.removeId);
  // Canonical tree order combines vertical children upper-first. Horizontally,
  // grandchildren replace the removed child's slot between untouched siblings.
  const ordered=orderedCards(state);
  const shifted=plan.kind==='horizontal'
    ?orderedCards(state,removed.id).map(c=>[c,depth(state,c)-(depth(state,removed)-depth(state,keep))])
    :[];
  keep.text=joinMarkdown(keep.text,removed.text);
  shifted.forEach(([card,column])=>{card.column=column;});
  for(const child of siblings(state,removed.id))child.parent=keep.id;
  keep.collapsed=false;
  state.cards=ordered.filter(c=>c.id!==removed.id);
  return {id:keep.id};
}
