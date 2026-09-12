import { depth, siblings } from './model-v3.mjs';

export const CARD_GAP=86;
// Two terminal buttons sit 38px from their cards and are 27px wide.
// 120px leaves 17px between their edges when adjacent branches share a column.
export const BRANCH_GAP=120;

export function createBranchSpacing(state){
  const cache=new Map();
  function boundaries(card){
    if(cache.has(card.id))return cache.get(card.id);
    const columns=new Map([[depth(state,card),{first:card.parent,last:card.parent}]]);
    for(const child of siblings(state,card.id)){
      for(const [column,edge] of boundaries(child)){
        if(columns.has(column))columns.get(column).last=edge.last;
        else columns.set(column,{...edge});
      }
    }
    cache.set(card.id,columns);return columns;
  }
  return (left,right)=>{
    if(!right)return CARD_GAP;
    const next=boundaries(right);
    for(const [column,edge] of boundaries(left)){
      if(next.has(column)&&edge.last!==next.get(column).first)return BRANCH_GAP;
    }
    return CARD_GAP;
  };
}
