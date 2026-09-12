import { importMarkdown } from './markdown-import-v1.mjs';
import { formatMarkdownSelection } from './formatting-v1.mjs';
import { createMarkdownEditor, readMarkdownEditor, focusMarkdownEditor } from './native-editor-v1.mjs';
import { newCard, siblings, depth, addCard, moveCard, removeCard, orderedCards, exportMarkdown, validState } from './model-v2.mjs';
const $=s=>document.querySelector(s), viewport=$('#viewport'),board=$('#board'),cardsEl=$('#cards'),additions=$('#additions'),connections=$('#connections');
const STORAGE_KEY='cardamomo.draft.v1';
let state={title:'Untitled',cards:[newCard()]},undoStack=[],redoStack=[],editing=null,zoom=1,positions=new Map(),saveTimer,toastTimer,storageFailed=false;
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(validState(saved))state=saved;}catch{storageFailed=true;}
const clone=()=>JSON.stringify(state);
function checkpoint(){undoStack.push(clone());if(undoStack.length>80)undoStack.shift();redoStack=[];updateStats();}
function save(){clearTimeout(saveTimer);try{localStorage.setItem(STORAGE_KEY,clone());storageFailed=false;$('#save-status').textContent='saved in this browser';}catch{storageFailed=true;$('#save-status').textContent='not saved · please export';}updateStats();}
function scheduleSave(){$('#save-status').textContent='saving…';clearTimeout(saveTimer);saveTimer=setTimeout(save,300);updateStats();}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
function updateStats(){const words=state.cards.reduce((n,c)=>n+(c.text.trim().match(/\S+/g)?.length||0),0);$('#word-count').textContent=`${words} ${words===1?'word':'words'}`;$('#card-count').textContent=`${state.cards.length} ${state.cards.length===1?'card':'cards'}`;$('#undo').disabled=!undoStack.length;$('#first-hint').hidden=state.cards.length!==1||!!state.cards[0].text||!!editing;}
function preview(text){return text?DOMPurify.sanitize(marked.parse(text,{gfm:true}),{FORBID_TAGS:['style','iframe','form','input','button'],FORBID_ATTR:['style']}):'<div class="placeholder">Begin anywhere.<small>Markdown welcome.</small></div>';}
function render(){cardsEl.replaceChildren();$('#document-title').value=state.title;for(const [i,c] of orderedCards(state).entries()){
 const el=document.createElement('article');el.className='card';el.dataset.id=c.id;el.tabIndex=0;el.setAttribute('aria-label',`Card ${i+1}, column ${depth(state,c)+1}`);
 const handle=document.createElement('button');handle.className='drag-handle';handle.textContent='⠿';handle.title='Drag to reorder · Alt + ↑ / ↓';handle.setAttribute('aria-label',`Move card ${i+1}`);handle.addEventListener('pointerdown',e=>startDrag(e,c.id));handle.addEventListener('click',e=>e.stopPropagation());
 const del=document.createElement('button');del.className='delete-card';del.textContent='×';del.title='Remove card (undo available)';del.setAttribute('aria-label',`Remove card ${i+1}`);del.addEventListener('click',e=>{e.stopPropagation();finishEditing();checkpoint();removeCard(state,c.id);save();render();toast('Card removed. Undo to bring it back.');});
 const content=document.createElement('div');content.className='card-content';content.innerHTML=preview(c.text);content.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',e=>e.stopPropagation());});content.querySelectorAll('img').forEach(img=>{img.addEventListener('load',layout);img.addEventListener('error',layout);});
 const order=document.createElement('span');order.className='card-order';order.textContent=String(i+1).padStart(2,'0');el.append(handle,del,content,order);el.addEventListener('click',()=>startEditing(c.id));
 el.addEventListener('keydown',e=>{if(e.target.closest('.card-editor'))return;if(e.key==='Enter'){e.preventDefault();startEditing(c.id);}if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const list=orderedCards(state).filter(n=>depth(state,n)===depth(state,c)),i=list.findIndex(n=>n.id===c.id),before=e.key==='ArrowUp',target=list[i+(before?-1:1)];if(target){checkpoint();moveCard(state,c.id,target.id,before);save();render();cardsEl.querySelector(`[data-id="${c.id}"]`).focus();}}});cardsEl.append(el);
 }updateStats();layout();}
function layout(){const w=360,gapX=125,gapY=86,pad=70,baseX=Math.max(pad,(viewport.clientWidth/zoom-w)/2),baseY=Math.max(90,(viewport.clientHeight/zoom-270)/2),heights=new Map([...cardsEl.children].map(el=>[el.dataset.id,el.offsetHeight])),spans=new Map();
 function span(c){const kids=siblings(state,c.id),h=Math.max(heights.get(c.id)||218,kids.reduce((v,n)=>v+span(n),0)+Math.max(0,kids.length-1)*gapY);spans.set(c.id,h);return h;}siblings(state,null).forEach(span);positions=new Map();
 function place(list,start){let y=start;for(const c of list){const col=depth(state,c);positions.set(c.id,{x:baseX+col*(w+gapX),y,h:heights.get(c.id)||218,col});place(siblings(state,c.id),y);y+=spans.get(c.id)+gapY;}}place(siblings(state,null),baseY);
 let maxX=viewport.clientWidth/zoom,maxY=viewport.clientHeight/zoom;for(const el of cardsEl.children){const p=positions.get(el.dataset.id);el.style.left=p.x+'px';el.style.top=p.y+'px';maxX=Math.max(maxX,p.x+w+pad);maxY=Math.max(maxY,p.y+p.h+120);}board.style.width=maxX+'px';board.style.height=maxY+'px';board.style.zoom=zoom;connections.setAttribute('width',maxX);connections.setAttribute('height',maxY);connections.replaceChildren();additions.replaceChildren();
 function line(d){const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);connections.append(p);}
 function plus(x,y,id,dir,label){const b=document.createElement('button');b.className='add-button';b.textContent='+';b.style.left=x+'px';b.style.top=y+'px';b.title=label;b.setAttribute('aria-label',label);b.addEventListener('click',()=>insert(id,dir));additions.append(b);}
 for(const parent of [null,...state.cards.map(c=>c.id)]){const groups=new Map();for(const card of siblings(state,parent)){const column=depth(state,card);if(!groups.has(column))groups.set(column,[]);groups.get(column).push(card);}for(const list of groups.values()){if(!list.length)continue;const first=positions.get(list[0].id);plus(first.x+w/2,first.y-38,list[0].id,'before','Add card above');for(let i=0;i<list.length;i++){const c=list[i],p=positions.get(c.id),next=list[i+1]&&positions.get(list[i+1].id);if(next){line(`M${p.x+w/2},${p.y+p.h} V${next.y}`);plus(p.x+w/2,(p.y+p.h+next.y)/2,c.id,'after','Insert card between');}else plus(p.x+w/2,p.y+p.h+38,c.id,'after','Add card below');}}}
 for(const c of state.cards){const p=positions.get(c.id),kids=siblings(state,c.id),right=p.x+w;if(kids.length){for(const k of kids){const q=positions.get(k.id),mid=right+gapX/2;line(`M${right},${p.y+p.h/2} H${mid} V${q.y+q.h/2} H${q.x}`);}}else plus(right+38,p.y+p.h/2,c.id,'right','Add child to the right');}}
function insert(id,dir){finishEditing();checkpoint();const c=addCard(state,id,dir);save();render();startEditing(c.id);reveal(c.id);}
function startEditing(id) {
  if(editing===id)return;
  finishEditing();
  const c=state.cards.find(c=>c.id===id);
  if(!c)return;
  checkpoint(); editing=id;
  const el=cardsEl.querySelector(`[data-id="${id}"]`);
  el.classList.add('editing');
  const editor=createMarkdownEditor(c.text);
  el.querySelector('.card-content').replaceWith(editor);
  let pendingLayout=0;
  editor.addEventListener('input',()=>{
    c.text=readMarkdownEditor(editor);
    scheduleSave();
    // Let the native editing operation finish before measuring card positions.
    if(!pendingLayout)pendingLayout=requestAnimationFrame(()=>{pendingLayout=0;layout();});
  });
  editor.addEventListener('keydown',e=>{
    if(!e.isComposing && !e.altKey && (e.metaKey || e.ctrlKey) && ['b','i'].includes(e.key.toLowerCase())) {
      e.preventDefault();e.stopPropagation();
      if(formatMarkdownSelection(editor,e.key.toLowerCase()==='b'?'bold':'italic')) {
        c.text=readMarkdownEditor(editor);scheduleSave();layout();
      }
      return;
    }
    if(e.key==='Escape'&&!e.isComposing){
      e.preventDefault();e.stopPropagation();finishEditing();
      cardsEl.querySelector(`[data-id="${id}"]`)?.focus();
    }
  });
  layout();focusMarkdownEditor(editor);updateStats();
}
function finishEditing(){if(!editing)return;editing=null;if(undoStack.at(-1)===clone())undoStack.pop();save();render();}
function reveal(id){cardsEl.querySelector(`[data-id="${id}"]`)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest',inline:'nearest'});}
function undo(redo=false){finishEditing();const source=redo?redoStack:undoStack,target=redo?undoStack:redoStack;if(!source.length)return;target.push(clone());state=JSON.parse(source.pop());save();render();toast(redo?'Change restored':'Change undone');}
function replaceDraft(next,message){
  finishEditing();checkpoint();state=next;
  zoom=1;$('#reset-view').textContent='100%';save();render();
  viewport.scrollTo({left:0,top:0});toast(message);
}
$('#new-document').addEventListener('click',()=>replaceDraft({title:'Untitled',cards:[newCard()]},'New document. Undo restores your previous draft.'));
$('#open-document').addEventListener('click',()=>{finishEditing();$('#markdown-file').click();});
$('#markdown-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  $('#open-document').disabled=true;$('#new-document').disabled=true;
  try{
    const source=await file.text();
    const next=importMarkdown(source,file.name,text=>marked.lexer(text,{gfm:true}));
    if(!validState(next))throw new Error('The Markdown structure could not be opened.');
    replaceDraft(next,`Opened ${file.name}. Undo restores your previous draft.`);
  }catch(error){toast(error.message||'Could not open this file. Your draft is unchanged.');}
  finally{$('#open-document').disabled=false;$('#new-document').disabled=false;}
});
function download(){finishEditing();const markdown=exportMarkdown(state);if(!markdown){toast('Write a little something first.');return;}const url=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=(state.title.trim()||'Untitled').replace(/[\\/:*?"<>|]/g,'-')+'.md';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your words, all together.');}
function startDrag(event,id){if(event.button!==0)return;event.preventDefault();event.stopPropagation();finishEditing();const source=cardsEl.querySelector(`[data-id="${id}"]`),origin=source.getBoundingClientRect(),startY=event.clientY;let active=false,ghost=null,target=null,before=false,pointerY=startY,scrollFrame;
 function autoScroll(){if(!active)return;const r=viewport.getBoundingClientRect();if(pointerY<r.top+60)viewport.scrollTop-=12;else if(pointerY>r.bottom-60)viewport.scrollTop+=12;scrollFrame=requestAnimationFrame(autoScroll);}
 function move(e){pointerY=e.clientY;if(!active&&Math.abs(e.clientY-startY)<5)return;if(!active){active=true;source.classList.add('dragging');ghost=source.cloneNode(true);ghost.classList.add('drag-ghost');ghost.style.left=origin.left+'px';ghost.style.width=origin.width+'px';ghost.style.minHeight=origin.height+'px';document.body.append(ghost);autoScroll();}ghost.style.top=(origin.top+e.clientY-startY)+'px';document.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));target=null;let nearest=Infinity;const card=state.cards.find(c=>c.id===id);for(const el of cardsEl.children){if(el.dataset.id===id)continue;const c=state.cards.find(c=>c.id===el.dataset.id);if(depth(state,c)!==depth(state,card))continue;const r=el.getBoundingClientRect(),dist=Math.abs(e.clientY-(r.top+r.height/2));if(dist<nearest){target=el;nearest=dist;before=e.clientY<r.top+r.height/2;}}if(target)target.classList.add(before?'drop-before':'drop-after');}
 function end(e){document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);cancelAnimationFrame(scrollFrame);ghost?.remove();source.classList.remove('dragging');if(active&&target&&e.type!=='pointercancel'){checkpoint();moveCard(state,id,target.dataset.id,before);save();render();reveal(id);}else document.querySelectorAll('.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-after'));}document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);}
document.addEventListener('pointerdown',e=>{if(editing&&!e.target.closest('.card')&&!e.target.closest('.add-button'))finishEditing();});
document.addEventListener('keydown',e=>{const input=e.target.isContentEditable||e.target.matches('textarea,input');if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!input){e.preventDefault();undo(e.shiftKey);}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();toast(storageFailed?'Please export to save your writing.':'Saved in this browser.');}});
$('#undo').addEventListener('click',()=>undo());$('#export').addEventListener('click',download);$('#document-title').addEventListener('focus',checkpoint);$('#document-title').addEventListener('input',e=>{state.title=e.target.value;scheduleSave();});$('#document-title').addEventListener('blur',()=>{if(!state.title.trim()){state.title='Untitled';$('#document-title').value=state.title;}save();});
function setZoom(v){finishEditing();zoom=Math.max(.5,Math.min(1.5,v));$('#reset-view').textContent=Math.round(zoom*100)+'%';layout();}$('#zoom-in').addEventListener('click',()=>setZoom(zoom+.1));$('#zoom-out').addEventListener('click',()=>setZoom(zoom-.1));$('#reset-view').addEventListener('click',()=>{setZoom(1);viewport.scrollTo({left:0,top:0,behavior:'smooth'});});
$('#help').addEventListener('click',()=>$('#guide').showModal());$('.close-guide').addEventListener('click',()=>$('#guide').close());$('#guide').addEventListener('click',e=>{if(e.target===$('#guide')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
window.addEventListener('resize',layout);window.addEventListener('pagehide',save);window.addEventListener('beforeunload',e=>{save();if(storageFailed&&state.cards.some(c=>c.text)){e.preventDefault();e.returnValue='';}});render();save();document.fonts.ready.then(layout);
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_draft',title:'Read draft',description:'Read the current Cardamomo cards in Markdown export order.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){return{title:state.title,cards:orderedCards(state).map(c=>({...c,column:depth(state,c)+1})),markdown:exportMarkdown(state)};}});
 register({name:'add_card',title:'Add card',description:'Create a sibling before or after a card, or its first child to the right.',inputSchema:{type:'object',properties:{cardId:{type:'string'},direction:{type:'string',enum:['before','after','right']},markdown:{type:'string'}},required:['cardId','direction','markdown'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input.markdown!=='string'||!['before','after','right'].includes(input.direction)||!state.cards.some(c=>c.id===input.cardId))throw Error('An existing card, valid direction, and Markdown string are required.');if(input.direction==='right'&&siblings(state,input.cardId).length)throw Error('This card already has children. Add a sibling above or below one of its children.');finishEditing();checkpoint();const c=addCard(state,input.cardId,input.direction);c.text=input.markdown;save();render();reveal(c.id);return{id:c.id,column:depth(state,c)+1};}});window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
