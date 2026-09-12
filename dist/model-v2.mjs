export function newCard(parent=null,column){return{id:crypto.randomUUID(),parent,text:'',...(column===undefined?{}:{column})};}
export function siblings(s,parent){return s.cards.filter(c=>c.parent===parent);}
export function depth(s,c){
 const chain=[c];
 while(c.parent!==null){c=s.cards.find(n=>n.id===c.parent);if(!c||chain.length>s.cards.length)throw Error('Invalid tree');chain.push(c);}
 let column=-1;
 for(const node of chain.reverse())column=Math.max(column+1,node.column??0);
 return column;
}
export function addCard(s,id,direction){const target=s.cards.find(c=>c.id===id);if(!target)throw Error('Card not found');const card=newCard(direction==='right'?id:target.parent,depth(s,target)+(direction==='right'?1:0));if(direction==='left'){target.parent=card.id;s.cards.splice(s.cards.indexOf(target),0,card);}else if(direction==='right')s.cards.push(card);else if(['before','after'].includes(direction))s.cards.splice(s.cards.indexOf(target)+(direction==='after'?1:0),0,card);else throw Error('Unknown direction');return card;}
export function moveCard(s,id,targetId,before){const c=s.cards.find(c=>c.id===id),t=s.cards.find(c=>c.id===targetId);if(!c||!t||c===t||depth(s,c)!==depth(s,t))return false;s.cards.splice(s.cards.indexOf(c),1);c.parent=t.parent;s.cards.splice(s.cards.indexOf(t)+(before?0:1),0,c);return true;}
export function removeCard(s,id){const c=s.cards.find(c=>c.id===id);if(!c)return;const ordered=orderedCards(s),kids=siblings(s,id);const lifted=orderedCards(s,id).map(n=>[n,Math.max(0,depth(s,n)-1)]);lifted.forEach(([n,column])=>{n.column=column;});kids.forEach(k=>k.parent=c.parent);s.cards=ordered.filter(n=>n.id!==id);if(!s.cards.length)s.cards.push(newCard());}
export function orderedCards(s,parent=null){return siblings(s,parent).flatMap(c=>[c,...orderedCards(s,c.id)]);}
export function exportMarkdown(s){const t=orderedCards(s).map(c=>c.text.trim()).filter(Boolean).join('\n\n');return t?t+'\n':'';}
export function validState(s){if(!s||typeof s.title!=='string'||!Array.isArray(s.cards)||!s.cards.length)return false;const ids=new Set(s.cards.map(c=>c.id));if(ids.size!==s.cards.length||!s.cards.some(c=>c.parent===null))return false;return s.cards.every(c=>{if((c.column!==undefined&&(!Number.isInteger(c.column)||c.column<0))||typeof c.id!=='string'||typeof c.text!=='string'||(c.parent!==null&&!ids.has(c.parent)))return false;try{depth(s,c);return true;}catch{return false;}});}
