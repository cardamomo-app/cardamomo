import { depth, orderedCards } from './model-v3.mjs';

// Exclude the entire moving branch so a card can never become its own ancestor.
export function findDropTarget(state,id,column,y,rects){
  const excluded=new Set([id,...orderedCards(state,id).map(c=>c.id)]);
  const available=state.cards.filter(c=>!excluded.has(c.id)&&rects.has(c.id));
  const distance=c=>{const r=rects.get(c.id);return Math.max(r.top-y,0,y-r.bottom);};
  const nearest=cards=>cards.sort((a,b)=>distance(a)-distance(b)||Math.abs(rects.get(a.id).top-y)-Math.abs(rects.get(b.id).top-y))[0];
  const anchor=nearest(available.filter(c=>depth(state,c)===column));
  const parent=nearest(available.filter(c=>depth(state,c)===column-1));
  if(anchor&&(!parent||distance(anchor)<=distance(parent)+43)){
    const r=rects.get(anchor.id);
    return {parent:anchor.parent,column,anchorId:anchor.id,before:y<(r.top+r.bottom)/2,highlightId:anchor.id,mode:'sibling'};
  }
  if(column===0)return{parent:null,column,anchorId:null,highlightId:null,mode:'root'};
  return parent?{parent:parent.id,column,anchorId:null,highlightId:parent.id,mode:'child'}:null;
}
