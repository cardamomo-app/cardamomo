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
export function moveBranch(s,id,parent,column,anchorId=null,before=false){
 const card=s.cards.find(c=>c.id===id),p=s.cards.find(c=>c.id===parent),anchor=s.cards.find(c=>c.id===anchorId);
 if(!card||!Number.isInteger(column)||column<0||(parent!==null&&(!p||depth(s,p)>=column)))return false;
 const branch=[card,...orderedCards(s,id)],ids=new Set(branch.map(c=>c.id));
 if(ids.has(parent)||ids.has(anchorId))return false;
 if(anchorId!==null&&(!anchor||anchor.parent!==parent||depth(s,anchor)!==column))return false;
 const delta=column-depth(s,card),columns=branch.map(c=>[c,depth(s,c)+delta]);
 s.cards.splice(s.cards.indexOf(card),1);
 card.parent=parent;
 columns.forEach(([c,col])=>{c.column=col;});
 if(anchor)s.cards.splice(s.cards.indexOf(anchor)+(before?0:1),0,card);
 else s.cards.push(card);
 return true;
}
export function moveCard(s,id,targetId,before){const target=s.cards.find(c=>c.id===targetId);return !!target&&moveBranch(s,id,target.parent,depth(s,target),targetId,before);}
export function splitCard(s,id,before,after){
 const card=s.cards.find(c=>c.id===id);
 if(!card||typeof before!=='string'||typeof after!=='string')return null;
 const next=addCard(s,id,'after');card.text=before;next.text=after;return next;
}
export function removeCard(s,id){const c=s.cards.find(c=>c.id===id);if(!c)return;const ordered=orderedCards(s),kids=siblings(s,id);const lifted=orderedCards(s,id).map(n=>[n,Math.max(0,depth(s,n)-1)]);lifted.forEach(([n,column])=>{n.column=column;});kids.forEach(k=>k.parent=c.parent);s.cards=ordered.filter(n=>n.id!==id);if(!s.cards.length)s.cards.push(newCard());}
export function orderedCards(s,parent=null){const list=siblings(s,parent);const roots=parent===null?[...list.filter(c=>!c.docked),...list.filter(c=>c.docked)]:list;return roots.flatMap(c=>[c,...orderedCards(s,c.id)]);}
export function exportMarkdown(s){const t=orderedCards(s).map(c=>c.text.trim()).filter(Boolean).join('\n\n');return t?t+'\n':'';}
export function validState(s){if(!s||typeof s.title!=='string'||!Array.isArray(s.cards)||!s.cards.length)return false;const ids=new Set(s.cards.map(c=>c.id));if(ids.size!==s.cards.length||!s.cards.some(c=>c.parent===null))return false;return s.cards.every(c=>{if((c.docked!==undefined&&(typeof c.docked!=='boolean'||(c.docked&&c.parent!==null)))||(c.column!==undefined&&(!Number.isInteger(c.column)||c.column<0))||typeof c.id!=='string'||typeof c.text!=='string'||(c.parent!==null&&!ids.has(c.parent)))return false;try{depth(s,c);return true;}catch{return false;}});}
