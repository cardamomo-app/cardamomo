import { siblings } from './model-v3.mjs';

export function visibleCards(state,parent=null){
  return siblings(state,parent).flatMap(card=>[card,...(card.collapsed===true?[]:visibleCards(state,card.id))]);
}

export function toggleBranch(state,id){
  const card=state.cards.find(c=>c.id===id);
  if(!card||!siblings(state,id).length)return false;
  card.collapsed=card.collapsed!==true;
  return true;
}

// Commands that open a hidden card must make its ancestors visible first.
export function expandAncestors(state,id){
  let card=state.cards.find(c=>c.id===id),changed=false;
  while(card&&card.parent!==null){
    card=state.cards.find(c=>c.id===card.parent);
    if(card?.collapsed===true){card.collapsed=false;changed=true;}
  }
  return changed;
}
