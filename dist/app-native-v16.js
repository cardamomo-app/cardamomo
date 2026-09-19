import { highlightExtension } from './highlight-v1.mjs';
import { trimWordSelection } from './word-selection-v1.mjs';
import { completeSymbolPair } from './symbol-pairs-v1.mjs?v=2';
import { dockRoot, dockBranch, restoreDockBranch } from './dock-v1.mjs';
import { cardLinkTarget, isCardLink, storeCardLinks, displayCardLinks } from './card-links-v1.mjs?v=dock1';
import { openDocument, serializeDocument } from './document-file-v1.mjs?v=dock1';
import { pasteMarkdown } from './clipboard-v1.mjs?v=2';
import { formatCurrentHeading } from './heading-v1.mjs';
import { formatMarkdownLink } from './link-v1.mjs';
import { formatMarkdownSelection } from './formatting-v1.mjs?v=5';
import { cycleSelectedText, resetCaseCycle, caseModes } from './text-case-v1.mjs?v=2';
import { readEditorSplit, focusEditorStart } from './split-editor-v1.mjs?v=2';
import { findDropTarget } from './drop-target-v1.mjs?v=dock1';
import { createBranchSpacing } from './branch-spacing-v1.mjs?v=dock1';
import { visibleCards, toggleBranch, expandAncestors } from './branch-view-v1.mjs?v=dock1';
import { installFocusMode } from './focus-mode-v1.mjs?v=3';
import { navigationTarget } from './card-navigation-v1.mjs?v=dock1';
import { planMerge, mergeCard } from './card-merge-v1.mjs?v=dock1';
import { createMarkdownEditor, readMarkdownEditor, focusMarkdownEditor } from './native-editor-v1.mjs?v=2';
import { newCard, siblings, depth, addCard, moveCard, moveBranch, splitCard, removeCard, orderedCards, exportMarkdown, validState } from './model-v3.mjs?v=split1';
const $=s=>document.querySelector(s), viewport=$('#viewport'),board=$('#board'),cardsEl=$('#cards'),additions=$('#additions'),connections=$('#connections');
const STORAGE_KEY='cardamomo.draft.v1';
let state={title:'Untitled',cards:[newCard()]},undoStack=[],redoStack=[],editing=null,zoom=1,positions=new Map(),saveTimer,toastTimer,storageFailed=false;
let structuralUndoCard=null,dockOpen=false,dockTemporary=false,dockCloseTimer,dragSession=false,cancelActiveDrag=null,canvasBaseX=70;
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(validState(saved))state=saved;}catch{storageFailed=true;}
marked.use(highlightExtension);
const lexLinks=text=>marked.lexer(text,{gfm:true});
const storedText=text=>storeCardLinks(text,state,lexLinks);
const readCardEditor=editor=>storedText(readMarkdownEditor(editor));
for(const card of state.cards)card.text=storedText(card.text);
const clone=()=>JSON.stringify(state);
function checkpoint(){undoStack.push(clone());if(undoStack.length>80)undoStack.shift();redoStack=[];updateStats();}
function save(){clearTimeout(saveTimer);try{localStorage.setItem(STORAGE_KEY,clone());storageFailed=false;$('#save-status').textContent='saved in this browser';}catch{storageFailed=true;$('#save-status').textContent='not saved · please export';}updateStats();}
function scheduleSave(){$('#save-status').textContent='saving…';clearTimeout(saveTimer);saveTimer=setTimeout(save,300);updateStats();}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
function updateStats(){const words=state.cards.reduce((n,c)=>n+(c.text.trim().match(/\S+/g)?.length||0),0);$('#word-count').textContent=`${words} ${words===1?'word':'words'}`;$('#card-count').textContent=`${state.cards.length} ${state.cards.length===1?'card':'cards'}`;$('#undo').disabled=!undoStack.length;$('#redo').disabled=!redoStack.length;}
function preview(text){return text?DOMPurify.sanitize(marked.parse(text,{gfm:true}),{FORBID_TAGS:['style','iframe','form','input','button'],FORBID_ATTR:['style']}):'';}
function render(){cardsEl.replaceChildren();$('#document-title').value=state.title;const numbers=new Map(orderedCards(state).map((c,i)=>[c.id,i]));for(const c of visibleCards(state)){const i=numbers.get(c.id);
 const el=document.createElement('article');el.className='card';el.dataset.id=c.id;el.tabIndex=0;el.setAttribute('aria-label',`Card ${i+1}, column ${depth(state,c)+1}`);
 const handle=document.createElement('button');handle.className='drag-handle';handle.innerHTML='<span aria-hidden="true">⠿</span>';handle.title='Drag to reorder · Alt + ↑ / ↓';handle.setAttribute('aria-label',`Move card ${i+1}`);handle.addEventListener('pointerdown',e=>startDrag(e,c.id));handle.addEventListener('click',e=>e.stopPropagation());
 const del=document.createElement('button');del.className='delete-card';del.textContent='×';del.title='Remove card (undo available)';del.setAttribute('aria-label',`Remove card ${i+1}`);del.addEventListener('click',e=>{e.stopPropagation();finishEditing();checkpoint();removeCard(state,c.id);save();render();toast('Card removed. Undo to bring it back.');});
 const content=document.createElement('div');content.className='card-content';content.innerHTML=preview(c.text);content.querySelectorAll('a').forEach(a=>{
   const destination=a.getAttribute('href')||'';
   if(isCardLink(destination)){
     const target=cardLinkTarget(state,destination),number=target?orderedCards(state).findIndex(card=>card.id===target)+1:null;
     a.title=number?`Go to card ${number}`:'Destination card not found';
     a.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const id=cardLinkTarget(state,destination);if(id)startEditing(id);else toast('Destination card not found. It may have been removed.');});
     a.addEventListener('keydown',event=>{if(event.key==='Enter')event.stopPropagation();});
   }else{a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',event=>event.stopPropagation());}
 });content.querySelectorAll('img').forEach(img=>{img.addEventListener('load',layout);img.addEventListener('error',layout);});
 const order=document.createElement('span');order.className='card-order';order.textContent=String(i+1).padStart(2,'0');el.append(handle,del,content,order);el.addEventListener('click',()=>startEditing(c.id));
 el.addEventListener('keydown',e=>{if(e.target.closest('.card-editor'))return;if(e.key==='Enter'){e.preventDefault();startEditing(c.id);}if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const list=visibleCards(state).filter(n=>depth(state,n)===depth(state,c)),i=list.findIndex(n=>n.id===c.id),before=e.key==='ArrowUp',target=list[i+(before?-1:1)];if(target){checkpoint();moveCard(state,c.id,target.id,before);save();render();cardsEl.querySelector(`[data-id="${c.id}"]`).focus();}}});cardsEl.append(el);
 }renderDock();updateStats();layout();}
function layout(){const view={cards:visibleCards(state)},w=360,gapX=125,pad=70,frame=viewport.getBoundingClientRect(),baseX=Math.max(pad,(frame.width/zoom-w)/2),baseY=Math.max(90,(frame.height/zoom-270)/2),heights=new Map([...cardsEl.children].map(el=>[el.dataset.id,el.offsetHeight])),spans=new Map(),gapBetween=createBranchSpacing(view);
 canvasBaseX=baseX;
 function span(c){const kids=siblings(view,c.id),h=Math.max(heights.get(c.id)||218,kids.reduce((v,n,i)=>v+span(n)+(i?gapBetween(kids[i-1],n):0),0));spans.set(c.id,h);return h;}siblings(view,null).forEach(span);positions=new Map();
 function place(list,start){let y=start;for(const [i,c] of list.entries()){const col=depth(state,c);positions.set(c.id,{x:baseX+col*(w+gapX),y,h:heights.get(c.id)||218,col});place(siblings(view,c.id),y);y+=spans.get(c.id)+gapBetween(c,list[i+1]);}}place(siblings(view,null),baseY);
 const rightRoom=Math.max(100,(frame.width/zoom-w)/2);
 let maxX=viewport.clientWidth/zoom,maxY=viewport.clientHeight/zoom;for(const el of cardsEl.children){const p=positions.get(el.dataset.id);el.style.left=p.x+'px';el.style.top=p.y+'px';maxX=Math.max(maxX,p.x+w+rightRoom);maxY=Math.max(maxY,p.y+p.h+120);}board.style.width=maxX+'px';board.style.height=maxY+'px';board.style.zoom=zoom;connections.setAttribute('width',maxX);connections.setAttribute('height',maxY);connections.replaceChildren();additions.replaceChildren();
 function line(d){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);connections.append(p);}
 function plus(x,y,id,dir,label){const b=document.createElement('button');b.className='add-button';b.textContent='+';b.style.left=x+'px';b.style.top=y+'px';b.title=label;b.setAttribute('aria-label',label);b.addEventListener('click',()=>insert(id,dir));additions.append(b);}
 for(const parent of [null,...view.cards.map(c=>c.id)]){const groups=new Map();for(const card of siblings(view,parent)){const column=depth(state,card);if(!groups.has(column))groups.set(column,[]);groups.get(column).push(card);}for(const list of groups.values()){if(!list.length)continue;const first=positions.get(list[0].id);plus(first.x+w/2,first.y-38,list[0].id,'before','Add card above');for(let i=0;i<list.length;i++){const c=list[i],p=positions.get(c.id),next=list[i+1]&&positions.get(list[i+1].id);if(next){line(`M${p.x+w/2},${p.y+p.h} V${next.y}`);plus(p.x+w/2,(p.y+p.h+next.y)/2,c.id,'after','Insert card between');}else plus(p.x+w/2,p.y+p.h+38,c.id,'after','Add card below');}}}
 if(!view.cards.length){
   const b=document.createElement('button');b.className='add-button';b.textContent='+';b.setAttribute('aria-label','Add card to canvas');b.title='Add card to canvas';b.style.left=(baseX+w/2)+'px';b.style.top=(baseY+100)+'px';
   b.addEventListener('click',()=>{checkpoint();const c=newCard();state.cards.push(c);save();render();startEditing(c.id);});additions.append(b);
 }
 const numbers=new Map(orderedCards(state).map((c,i)=>[c.id,i+1]));
 for(const c of view.cards){
   const p=positions.get(c.id),kids=siblings(state,c.id),right=p.x+w,mid=right+gapX/2;
   if(kids.length){
     const folded=c.collapsed===true,button=document.createElement('button');
     const first=positions.get(kids[0].id),parentMid=p.y+p.h/2;
     const branchY=first?Math.min(parentMid,first.y+first.h/2):parentMid;
     button.className='branch-toggle'+(folded?' collapsed':'');button.dataset.branchId=c.id;
     button.style.left=right+'px';button.style.top=branchY+'px';button.style.width=(gapX/2)+'px';
     button.setAttribute('aria-expanded',String(!folded));
     button.setAttribute('aria-label',`${folded?'Expand':'Collapse'} children of card ${numbers.get(c.id)}`);
     button.title=folded?`Expand ${orderedCards(state,c.id).length} hidden cards`:'Collapse this branch';
     button.addEventListener('click',()=>{
       finishEditing();checkpoint();toggleBranch(state,c.id);save();render();
       additions.querySelector(`[data-branch-id="${c.id}"]`)?.focus({preventScroll:true});
     });
     additions.append(button);
     if(!folded)for(const [i,k] of kids.entries()){
       const q=positions.get(k.id);
       line(i===0?`M${mid},${branchY} H${q.x}`:`M${mid},${branchY} V${q.y+q.h/2} H${q.x}`);
     }
   }else plus(right+38,p.y+p.h/2,c.id,'right','Add child to the right');
 }
}
function insert(id,dir){finishEditing();checkpoint();const c=addCard(state,id,dir);save();render();startEditing(c.id);}
function merge(id,key){
  const plan=planMerge(state,id,key);
  if(plan.error){toast(plan.error);return;}
  finishEditing();checkpoint();
  const result=mergeCard(state,id,key);
  save();render();startEditing(result.id);structuralUndoCard=result.id;
  toast('Cards merged. Undo restores both cards and their children.');
}
const cardShortcutKeys=new Set();
cardsEl.addEventListener('keydown',event=>{
  if(event.metaKey||!event.ctrlKey||event.isComposing)return;
  const navigate=event.altKey&&!event.shiftKey;
  const create=event.shiftKey&&!event.altKey;
  const combine=event.altKey&&event.shiftKey;
  if(!navigate&&!create&&!combine)return;
  const direction={ArrowRight:'right',ArrowUp:'before',ArrowDown:'after'}[event.key];
  const card=event.target.closest('.card');
  if(!card||(!direction&&!((navigate||combine)&&event.key==='ArrowLeft')))return;
  event.preventDefault();event.stopImmediatePropagation();
  cardShortcutKeys.add(event.key);
  // One deliberate key press performs one card operation.
  if(event.repeat)return;
  const id=card.dataset.id;
  const target=navigate?navigationTarget(state,id,event.key):null;
  if(navigate&&!target)return;
  // Match the right-hand plus, including branches whose children are folded.
  if(create&&direction==='right'&&siblings(state,id).length)return;
  // Keep the focused editor attached until native key handling has finished.
  setTimeout(()=>{
    if(!card.isConnected||!card.contains(document.activeElement))return;
    if(navigate)startEditing(target.id);
    else if(combine)merge(id,event.key);
    else insert(id,direction);
  },0);
},true);
function consumeCardShortcutKey(event){
  if(event.type==='keyup'&&['Shift','Control','Alt'].includes(event.key)){
    cardShortcutKeys.clear();return;
  }
  if(!cardShortcutKeys.has(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.type==='keyup')cardShortcutKeys.delete(event.key);
}
document.addEventListener('keypress',consumeCardShortcutKey,true);
document.addEventListener('keyup',consumeCardShortcutKey,true);
window.addEventListener('blur',()=>cardShortcutKeys.clear());
function startEditing(id) {
  if(editing===id)return;
  structuralUndoCard=null;
  finishEditing();
  const c=state.cards.find(c=>c.id===id);
  if(!c)return;
  const parked=dockRoot(state,id);
  if(parked){setDock(true);$('#dock-cards').querySelector(`[data-id="${parked.id}"]`)?.focus({preventScroll:true});toast('This card is in the dock. Drag its branch back to edit.');return;}
  if(expandAncestors(state,id)){save();render();}
  checkpoint(); editing=id;
  const el=cardsEl.querySelector(`[data-id="${id}"]`);
  el.classList.add('editing');
  const editor=createMarkdownEditor(displayCardLinks(c.text,state,lexLinks));
  el.querySelector('.card-content').replaceWith(editor);
  let pendingLayout=0;
  editor.addEventListener('dblclick',event=>{
    if(!event.shiftKey&&!event.metaKey&&!event.ctrlKey&&!event.altKey)trimWordSelection(editor);
  });
  editor.addEventListener('paste',event=>{
    if(pasteMarkdown(editor,event)){
      resetCaseCycle(editor);structuralUndoCard=null;
      c.text=readCardEditor(editor);scheduleSave();layout();
    }
  });
  editor.addEventListener('input',()=>{
    resetCaseCycle(editor);
    structuralUndoCard=null;
    c.text=readCardEditor(editor);
    scheduleSave();
    // Let the native editing operation finish before measuring card positions.
    if(!pendingLayout)pendingLayout=requestAnimationFrame(()=>{pendingLayout=0;layout();});
  });
  editor.addEventListener('keydown',e=>{
    if(!e.isComposing&&e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&e.key==='9'){
      e.preventDefault();e.stopPropagation();
      if(!e.repeat&&formatMarkdownSelection(editor,'highlight')){
        resetCaseCycle(editor);structuralUndoCard=null;
        c.text=readCardEditor(editor);scheduleSave();layout();
      }
      return;
    }
    if(completeSymbolPair(editor,e)){
      resetCaseCycle(editor);structuralUndoCard=null;
      c.text=readCardEditor(editor);scheduleSave();layout();return;
    }
    if(!e.isComposing&&!e.altKey&&!e.shiftKey&&(e.metaKey||e.ctrlKey)&&/^[0-4]$/.test(e.key)){
      e.preventDefault();e.stopPropagation();
      if(e.repeat)return;
      if(formatCurrentHeading(editor,Number(e.key))){
        resetCaseCycle(editor);structuralUndoCard=null;
        c.text=readCardEditor(editor);scheduleSave();layout();
      }
      return;
    }
    if(!e.isComposing&&!e.altKey&&!e.shiftKey&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='e'){
      const selection=editor.ownerDocument.getSelection();
      if(!selection?.rangeCount||selection.isCollapsed)return;
      const range=selection.getRangeAt(0);
      if(!editor.contains(range.startContainer)||!editor.contains(range.endContainer))return;
      e.preventDefault();e.stopPropagation();
      if(e.repeat)return;
      const mode=cycleSelectedText(editor);
      if(mode!==null){structuralUndoCard=null;c.text=readCardEditor(editor);scheduleSave();layout();toast(caseModes[mode]);}
      return;
    }
    if(!e.isComposing&&(e.metaKey||e.ctrlKey)&&e.key==='Enter'&&(!e.altKey||!e.shiftKey)){
      e.preventDefault();e.stopPropagation();
      if(e.repeat)return;
      const parts=readEditorSplit(editor);if(!parts)return;
      finishEditing();checkpoint();
      const next=splitCard(state,id,storedText(parts.before),storedText(parts.after),e.altKey?'right':'after');
      save();render();startEditing(next.id);focusEditorStart(cardsEl.querySelector('.card-editor'));reveal(next.id);
      structuralUndoCard=next.id;return;
    }
    if(structuralUndoCard===id&&!e.isComposing&&(e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){
      e.preventDefault();e.stopPropagation();structuralUndoCard=null;undo();return;
    }
    const formatKey=e.key.toLowerCase();
    if(!e.isComposing&&!e.altKey&&!e.shiftKey&&(e.metaKey||e.ctrlKey)&&formatKey==='k') {
      e.preventDefault();e.stopPropagation();
      if(!e.repeat)void formatMarkdownLink(editor).then(changed=>{
        if(changed&&editor.isConnected){resetCaseCycle(editor);structuralUndoCard=null;c.text=readCardEditor(editor);scheduleSave();layout();}
      });
      return;
    }
    if(!e.isComposing && !e.altKey && (e.metaKey || e.ctrlKey) &&
      (['b','i'].includes(formatKey)||(!e.shiftKey&&formatKey==='d'))) {
      e.preventDefault();e.stopPropagation();
      if(e.repeat)return;
      if(formatMarkdownSelection(editor,formatKey==='d'?'code':formatKey==='b'?'bold':'italic')) {
        c.text=readCardEditor(editor);scheduleSave();layout();
      }
      return;
    }
    if(e.key==='Escape'&&!e.isComposing){
      e.preventDefault();e.stopPropagation();finishEditing();
      cardsEl.querySelector(`[data-id="${id}"]`)?.focus();
    }
  });
  layout();focusMarkdownEditor(editor);updateStats();reveal(id);
}
function finishEditing(){if(!editing)return;editing=null;if(undoStack.at(-1)===clone())undoStack.pop();save();render();}
function reveal(id){if(dockRoot(state,id)){setDock(true);return;}if(expandAncestors(state,id)){save();render();}cardsEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest',inline:'center'});}
function undo(redo=false){finishEditing();const source=redo?redoStack:undoStack,target=redo?undoStack:redoStack;if(!source.length)return;target.push(clone());state=JSON.parse(source.pop());save();render();toast(redo?'Change restored':'Change undone');}
function replaceDraft(next,message,view={zoom:1,scrollLeft:0,scrollTop:0}){
  finishEditing();checkpoint();setDock(false);state=next;for(const card of state.cards)card.text=storedText(card.text);
  zoom=view.zoom;$('#reset-view').textContent=Math.round(zoom*100)+'%';save();render();
  const restoreView=()=>viewport.scrollTo({left:view.scrollLeft,top:view.scrollTop,behavior:'instant'});
  restoreView();
  // Fonts may finish loading after a file opens, changing the canvas dimensions.
  document.fonts.ready.then(()=>{if(state===next){layout();restoreView();}});
  toast(message);
}
$('#new-document').addEventListener('click',()=>replaceDraft({title:'Untitled',cards:[newCard()]},'New document. Undo restores your previous draft.'));
$('#open-document').addEventListener('click',()=>{finishEditing();$('#document-file').click();});
$('#document-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  $('#open-document').disabled=true;$('#new-document').disabled=true;
  try{
    const source=await file.text();
    const {state:next,view}=openDocument(source,file.name,text=>marked.lexer(text,{gfm:true}));
    if(!validState(next))throw new Error('The document structure could not be opened.');
    replaceDraft(next,`Opened ${file.name}. Undo restores your previous draft.`,view);
  }catch(error){toast(error.message||'Could not open this file. Your draft is unchanged.');}
  finally{$('#open-document').disabled=false;$('#new-document').disabled=false;}
});
function downloadFile(contents,extension,type){
  const url=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');
  a.href=url;a.download=(state.title.trim()||'Untitled').replace(/[\\/:*?"<>|]/g,'-')+extension;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function saveDocument(){
  // Input events already synchronize the card text; keep the current editor and caret.
  save();
  try{
    const contents=serializeDocument(state,{zoom,scrollLeft:Math.max(0,viewport.scrollLeft),scrollTop:Math.max(0,viewport.scrollTop)});
    downloadFile(contents,'.cardamomo','application/json;charset=utf-8');
    toast('Cardamomo document downloaded.');
  }catch(error){toast(error.message||'Could not save the document.');}
}
function download(){finishEditing();const markdown=exportMarkdown(state);if(!markdown){toast('Write a little something first.');return;}downloadFile(markdown,'.md','text/markdown;charset=utf-8');toast('Your words, all together.');}
function setDock(open,temporary=false,slowClose=false){
 clearTimeout(dockCloseTimer);
 dockOpen=open;dockTemporary=open&&temporary;
 const panel=$('#dock'),button=$('#dock-toggle');
 panel.classList.toggle('settled-close',!open&&slowClose);
 if(!open&&panel.contains(document.activeElement))button.focus({preventScroll:true});
 panel.classList.toggle('is-open',open);panel.inert=!open;
 button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Hide dock':'Show dock');
 button.title=(open?'Hide dock':'Show dock')+' (⌘/Ctrl Shift D)';
}
function renderDock(){
 const roots=state.cards.filter(c=>c.docked),numbers=new Map(orderedCards(state).map((c,i)=>[c.id,i+1]));
 const count=roots.reduce((total,c)=>total+1+orderedCards(state,c.id).length,0);
 $('#dock-count').textContent=count?String(count):'';$('#dock-toggle').classList.toggle('has-cards',roots.length>0);
 const list=$('#dock-cards');list.replaceChildren();
 for(const card of roots){
   const number=numbers.get(card.id),total=1+orderedCards(state,card.id).length;
   const el=document.createElement('article');el.className='dock-card';el.dataset.id=card.id;el.tabIndex=0;el.setAttribute('aria-label',`Docked card ${number}, ${total} ${total===1?'card':'cards'}`);
   const handle=document.createElement('button');handle.className='drag-handle';handle.innerHTML='<span aria-hidden="true">⠿</span>';handle.setAttribute('aria-label',`Move docked card ${number}`);handle.title='Drag back to the canvas';
   handle.addEventListener('pointerdown',e=>startDrag(e,card.id,true));
   const content=document.createElement('div');content.className='card-content dock-preview';content.innerHTML=preview(card.text);content.inert=true;
   const meta=document.createElement('div');meta.className='dock-card-meta';meta.textContent=String(number).padStart(2,'0')+(total>1?` · ${total} cards`:'');
   el.append(handle,content,meta);el.addEventListener('pointerdown',e=>{if(e.target===handle||handle.contains(e.target))return;startDrag(e,card.id,true);});list.append(el);
 }
}
$('#dock-toggle').addEventListener('pointerdown',e=>e.preventDefault());
$('#dock-toggle').addEventListener('click',()=>{if(!dragSession)setDock(!dockOpen);});
$('#dock-close').addEventListener('click',()=>{if(!dragSession)setDock(false);});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&dragSession){e.preventDefault();e.stopImmediatePropagation();cancelActiveDrag?.();return;}
 if(!e.isComposing&&!e.altKey&&(e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='d'&&!document.querySelector('dialog[open]')){
   e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&!dragSession)setDock(!dockOpen);return;
 }
 if(e.key==='Escape'&&dockOpen&&!dragSession&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();setDock(false);}
},true);
function startDrag(event,id,fromDock=false){
 if(event.button!==0||dragSession)return;
 clearTimeout(dockCloseTimer);
 event.preventDefault();event.stopPropagation();finishEditing();
 const source=(fromDock?$('#dock-cards'):cardsEl).querySelector(`[data-id="${id}"]`);
 if(!source)return;
 const origin=source.getBoundingClientRect(),branch=new Set([id,...orderedCards(state,id).map(c=>c.id)]);
 const startX=event.clientX,startY=event.clientY,grabX=startX-origin.left,grabY=startY-origin.top;
 const available=visibleCards(state).filter(c=>!branch.has(c.id));
 const maxColumn=available.length?Math.max(0,...available.map(c=>depth(state,c)))+1:0;
 let active=false,ghost=null,label=null,target=null,pointerX=startX,pointerY=startY,scrollFrame,option=event.altKey;
 dragSession=true;
 const clearDrop=()=>{cardsEl.querySelectorAll('.drop-before,.drop-after,.drop-child').forEach(el=>el.classList.remove('drop-before','drop-after','drop-child'));$('#dock').classList.remove('drop-ready');};
 const dockBounds=()=>{const panel=$('#dock'),r=panel.getBoundingClientRect(),right=document.documentElement.clientWidth-parseFloat(getComputedStyle(panel).right);return {left:right-r.width,right,top:r.top,bottom:r.bottom};};
 const overDock=()=>{const r=dockBounds();return dockOpen&&pointerX>=r.left&&pointerX<=r.right&&pointerY>=r.top&&pointerY<=r.bottom;};
 function syncOption(){
   if(!active||fromDock)return;
   if(option&&!dockOpen)setDock(true,true);
   else if(!option&&dockTemporary)setDock(false);
 }
 function updateDrop(){
   if(!active)return;
   const baseLeft=board.getBoundingClientRect().left+canvasBaseX*zoom,step=485*zoom;
   const width=360*zoom,centerX=pointerX+(fromDock?width/2-grabX:origin.width/2-grabX);
   const column=Math.max(0,Math.min(maxColumn,Math.round((centerX-baseLeft-width/2)/step)));
   const inDock=overDock();
   ghost.style.left=(inDock?pointerX-grabX:baseLeft+column*step)+'px';ghost.style.top=(pointerY-grabY)+'px';
   const rects=new Map([...cardsEl.children].map(el=>[el.dataset.id,el.getBoundingClientRect()])),bounds=viewport.getBoundingClientRect();
   target=inDock?(fromDock?null:{mode:'dock'}):pointerX>=bounds.left&&pointerX<=bounds.right&&pointerY>=bounds.top&&pointerY<=bounds.bottom?findDropTarget(state,id,column,pointerY,rects):null;
   clearDrop();
   if(target?.mode==='dock')$('#dock').classList.add('drop-ready');
   if(target?.highlightId)cardsEl.querySelector(`[data-id="${target.highlightId}"]`)?.classList.add(target.mode==='child'?'drop-child':target.before?'drop-before':'drop-after');
   const count=branch.size===1?'1 card':`${branch.size} cards`;
   label.textContent=target?.mode==='dock'?`Dock ${count}`:target?`${count} · column ${column+1}${target.mode==='child'?' · attach as child':''}`:'No place to move here';
   ghost.classList.toggle('invalid-drop',!target);
 }
 function autoScroll(){
   if(!active)return;
   if(overDock()){
     const list=$('#dock-cards'),r=list.getBoundingClientRect();
     if(pointerY<r.top+45)list.scrollTop-=9;else if(pointerY>r.bottom-45)list.scrollTop+=9;
   }else{
     const r=viewport.getBoundingClientRect(),right=dockOpen?Math.min(r.right,dockBounds().left):r.right;
     if(pointerX>=r.left&&pointerX<=right){
       if(pointerY<r.top+60)viewport.scrollTop-=12;else if(pointerY>r.bottom-60)viewport.scrollTop+=12;
       if(pointerX<r.left+60)viewport.scrollLeft-=12;else if(pointerX>right-60)viewport.scrollLeft+=12;
     }
   }
   updateDrop();scrollFrame=requestAnimationFrame(autoScroll);
 }
 function move(e){
   pointerX=e.clientX;pointerY=e.clientY;option=e.altKey;
   if(!active&&Math.hypot(pointerX-startX,pointerY-startY)<5)return;
   if(!active){
     active=true;document.body.classList.add('card-drag-active');
     for(const el of cardsEl.children)if(branch.has(el.dataset.id))el.classList.add('dragging');source.classList.add('dragging');
     ghost=source.cloneNode(true);ghost.className='card drag-ghost';ghost.removeAttribute('data-id');ghost.removeAttribute('tabindex');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
     ghost.style.width=(360*zoom)+'px';ghost.style.minHeight=Math.min(origin.height,260)+'px';
     label=document.createElement('div');label.className='drag-label';ghost.append(label);document.body.append(ghost);
     board.style.width=Math.max(parseFloat(board.style.width),canvasBaseX+maxColumn*485+430)+'px';
     syncOption();autoScroll();
   }
   syncOption();updateDrop();
 }
 function key(e){
   if(e.key==='Escape'&&e.type==='keydown'){e.preventDefault();e.stopImmediatePropagation();end({type:'pointercancel'});return;}
   if(e.key==='Alt'){option=e.type==='keydown';syncOption();updateDrop();}
 }
 function end(e){
   if(e.type==='pointerup'&&active){pointerX=e.clientX;pointerY=e.clientY;updateDrop();}
   document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',key,true);window.removeEventListener('blur',cancel);
   cancelAnimationFrame(scrollFrame);ghost?.remove();clearDrop();source.classList.remove('dragging');cardsEl.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));document.body.classList.remove('card-drag-active');dragSession=false;cancelActiveDrag=null;
   if(active&&target&&e.type!=='pointercancel'){
     checkpoint();
     const parked=target.mode==='dock';
     const moved=parked?dockBranch(state,id):fromDock?restoreDockBranch(state,id,target):moveBranch(state,id,target.parent,target.column,target.anchorId,target.before);
     if(moved){
       if(parked)setDock(true);
       else if(fromDock||dockTemporary)setDock(false);
       save();render();
       // Show the saved card in its new home before gently closing the dock.
       if(parked)dockCloseTimer=setTimeout(()=>setDock(false,false,true),350);
       // Keep the canvas where the user placed the branch; no extra recentering.
       if(!parked)cardsEl.querySelector(`[data-id="${id}"]`)?.focus({preventScroll:true});
       toast(parked?'Branch docked.':fromDock?'Branch returned to the canvas.':'Card and its children moved.');
     }else{undoStack.pop();layout();updateStats();}
   }else{if(dockTemporary)setDock(false);layout();}
 }
 function cancel(){end({type:'pointercancel'});}
 cancelActiveDrag=cancel;
 document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);document.addEventListener('keydown',key,true);document.addEventListener('keyup',key,true);window.addEventListener('blur',cancel);
}
document.addEventListener('pointerdown',e=>{if(editing&&!e.target.closest('.card')&&!e.target.closest('.add-button,.branch-toggle,#focus-toggle,#save-document,#reset-view'))finishEditing();});
document.addEventListener('keydown',e=>{const input=e.target.isContentEditable||e.target.matches('textarea,input');if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!input){e.preventDefault();undo(e.shiftKey);}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!e.repeat)saveDocument();}});
$('#undo').addEventListener('click',()=>undo());$('#redo').addEventListener('click',()=>undo(true));$('#export').addEventListener('click',download);$('#save-document').addEventListener('pointerdown',e=>e.preventDefault());$('#save-document').addEventListener('click',saveDocument);$('#document-title').addEventListener('focus',checkpoint);$('#document-title').addEventListener('input',e=>{state.title=e.target.value;scheduleSave();});$('#document-title').addEventListener('blur',()=>{if(!state.title.trim()){state.title='Untitled';$('#document-title').value=state.title;}save();});
function setZoom(v){finishEditing();zoom=Math.max(.5,Math.min(1.5,v));$('#reset-view').textContent=Math.round(zoom*100)+'%';layout();}$('#zoom-in').addEventListener('click',()=>setZoom(zoom+.1));$('#zoom-out').addEventListener('click',()=>setZoom(zoom-.1));
$('#reset-view').addEventListener('click',()=>{
  // Pick from the current view before changing zoom or rendering the editor.
  const frame=viewport.getBoundingClientRect(),x=frame.left+viewport.clientWidth/2,y=frame.top+viewport.clientHeight/2;
  let id=null,nearest=Infinity,nearestCenter=Infinity;
  for(const card of cardsEl.children){
    const r=card.getBoundingClientRect();
    const distance=Math.hypot(Math.max(r.left-x,0,x-r.right),Math.max(r.top-y,0,y-r.bottom));
    const center=Math.hypot(r.left+r.width/2-x,r.top+r.height/2-y);
    if(distance<nearest||(distance===nearest&&center<nearestCenter)){
      id=card.dataset.id;nearest=distance;nearestCenter=center;
    }
  }
  setZoom(1);
  // Correct the scroll position in the same paint as the zoom change.
  // A smooth scroll here would first expose the resized canvas at its old offset.
  cardsEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({behavior:'instant',block:'center',inline:'center'});
});
$('#help').addEventListener('click',()=>$('#guide').showModal());$('.close-guide').addEventListener('click',()=>$('#guide').close());$('#guide').addEventListener('click',e=>{if(e.target===$('#guide')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
window.addEventListener('resize',()=>{layout();if(editing)reveal(editing);});window.addEventListener('pagehide',save);window.addEventListener('beforeunload',e=>{save();if(storageFailed&&state.cards.some(c=>c.text)){e.preventDefault();e.returnValue='';}});render();save();document.fonts.ready.then(layout);
installFocusMode({button:$('#focus-toggle'),notify:toast,onChange:()=>requestAnimationFrame(()=>{layout();if(editing){cardsEl.querySelector('.card-editor')?.focus({preventScroll:true});reveal(editing);}})});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_draft',title:'Read draft',description:'Read the current Cardamomo cards in Markdown export order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){return{title:state.title,cards:orderedCards(state).map(c=>({...c,column:depth(state,c)+1})),markdown:exportMarkdown(state)};}});
 register({name:'add_card',title:'Add card',description:'Create a sibling before or after a card, or its first child to the right.',inputSchema:{type:'object',properties:{cardId:{type:'string'},direction:{type:'string',enum:['before','after','right']},markdown:{type:'string'}},required:['cardId','direction','markdown'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input.markdown!=='string'||!['before','after','right'].includes(input.direction)||!state.cards.some(c=>c.id===input.cardId))throw Error('An existing card, valid direction, and Markdown string are required.');if(input.direction==='right'&&siblings(state,input.cardId).length)throw Error('This card already has children. Add a sibling above or below one of its children.');finishEditing();checkpoint();const c=addCard(state,input.cardId,input.direction);c.text=storedText(input.markdown);save();render();reveal(c.id);return{id:c.id,column:depth(state,c)+1};}});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
