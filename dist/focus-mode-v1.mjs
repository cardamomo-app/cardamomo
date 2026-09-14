export function installFocusMode({button,onChange,notify,doc=document}){
  const root=doc.documentElement;
  const active=()=>(doc.fullscreenElement||doc.webkitFullscreenElement)===root;
  let pending=false,lastActive=false;
  function sync(){
    const enabled=active();
    root.classList.toggle('focus-mode',enabled);
    const label=enabled?'Exit focus mode':'Enter focus mode';
    button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(enabled));button.title=label;
    if(enabled!==lastActive){lastActive=enabled;onChange(enabled);}
  }
  async function toggle(){
    if(pending)return;
    pending=true;
    try{
      if(active()){
        const exit=doc.exitFullscreen||doc.webkitExitFullscreen;
        if(exit)await exit.call(doc);
      }else{
        const enter=root.requestFullscreen||root.webkitRequestFullscreen;
        if(!enter){notify('Fullscreen isn’t available here. Open Cardamomo in a browser tab.');return;}
        // Page fullscreen asks the browser to remove its navigation chrome.
        await enter.call(root,{navigationUI:'hide'});
      }
      sync();
    }catch{
      sync();notify('Couldn’t enter or exit fullscreen. Please try the focus button again.');
    }finally{pending=false;}
  }
  // Keep the writing selection while clicking the control.
  button.addEventListener('pointerdown',event=>event.preventDefault());
  button.addEventListener('click',toggle);
  doc.addEventListener('fullscreenchange',sync);
  doc.addEventListener('webkitfullscreenchange',sync);
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!event.isComposing&&active()&&!doc.querySelector('dialog[open]')){
      event.preventDefault();event.stopPropagation();void toggle();
    }
  },true);
  sync();
}
