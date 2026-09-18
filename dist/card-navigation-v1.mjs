import { depth, siblings } from './model-v3.mjs?v=dock1';
import { visibleCards } from './branch-view-v1.mjs?v=dock1';

export function navigationTarget(state,id,key){
  const card=state.cards.find(c=>c.id===id);
  if(!card)return null;
  if(key==='ArrowLeft')return state.cards.find(c=>c.id===card.parent)||null;
  // startEditing expands a folded parent when its child is opened.
  if(key==='ArrowRight')return siblings(state,id)[0]||null;
  if(!['ArrowUp','ArrowDown'].includes(key))return null;
  const column=depth(state,card);
  const cards=visibleCards(state).filter(c=>depth(state,c)===column);
  const index=cards.findIndex(c=>c.id===id);
  if(index<0)return null;
  return cards[index+(key==='ArrowUp'?-1:1)]||null;
}
