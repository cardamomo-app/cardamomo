const button = document.querySelector('#support');
const dialog = document.querySelector('#support-dialog');
const panel = document.querySelector('#support-panel');

function positionPanel() {
  const anchor = button.getBoundingClientRect();
  const gap = 10, edge = 12;
  // Reserve Ko-fi's recommended 712px for the form, plus our header/footer.
  const chromeHeight = dialog.offsetHeight - panel.clientHeight;
  const height = Math.min(712 + chromeHeight, Math.max(0, window.innerHeight - edge * 2));
  // Move upward when necessary so space above the toolbar isn't wasted.
  const top = Math.min(anchor.bottom + gap, Math.max(edge, window.innerHeight - height - edge));
  dialog.style.top = `${top}px`;
  dialog.style.left = `${Math.max(edge, Math.min(anchor.right - dialog.offsetWidth, window.innerWidth - dialog.offsetWidth - edge))}px`;
  dialog.style.height = `${height}px`;
}

button.addEventListener('click', () => {
  // Contact Ko-fi only after the user chooses to open the tip panel.
  if (!panel.firstElementChild) {
    const frame = document.createElement('iframe');
    frame.id = 'kofiframe';
    frame.title = 'Support Cardamomo on Ko-fi';
    frame.src = 'https://ko-fi.com/cardamomo/?hidefeed=true&widget=true&embed=true&preview=true';
    frame.height = '712';
    panel.append(frame);
  }
  dialog.showModal();
  positionPanel();
});

window.addEventListener('resize', () => { if (dialog.open) positionPanel(); });

document.querySelector('#close-support').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
// Keep app-wide writing shortcuts from changing the draft behind the dialog.
dialog.addEventListener('keydown', event => event.stopPropagation());
dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
