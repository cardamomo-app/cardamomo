import { orderedCards } from './model-v3.mjs?v=split1';

function canvasBranches(state) {
  const parents = new Set(state.cards.map(card => card.parent));
  return state.cards.filter(card => card.parent === null && !card.docked)
    .flatMap(root => [root, ...orderedCards(state, root.id)])
    .filter(card => parents.has(card.id));
}

export function foldAllAction(state) {
  const branches = canvasBranches(state);
  if (!branches.length) return null;
  return branches.some(card => card.collapsed === true) ? 'expand' : 'collapse';
}

export function toggleAllBranches(state) {
  const action = foldAllAction(state);
  if (!action) return false;
  for (const card of canvasBranches(state)) card.collapsed = action === 'collapse';
  return true;
}

export function isFoldAllShortcut(event, activeElement, dialogOpen = false) {
  const editable = element => element?.isContentEditable || element?.closest?.('input,textarea,select,[role="textbox"]');
  return event.key.toLowerCase() === 'c' && !event.metaKey && !event.ctrlKey && !event.altKey &&
    !event.isComposing && !event.repeat && !event.defaultPrevented && !dialogOpen &&
    !editable(event.target) && !editable(activeElement);
}
