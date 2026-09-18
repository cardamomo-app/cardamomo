import { moveBranch, orderedCards } from './model-v3.mjs?v=dock1';

export function dockRoot(state, id) {
  let card = state.cards.find(card => card.id === id);
  while (card && card.parent !== null) card = state.cards.find(parent => parent.id === card.parent);
  return card?.docked ? card : null;
}

export function dockBranch(state, id) {
  if (dockRoot(state, id)) return false;
  const card = state.cards.find(card => card.id === id);
  if (!card || !moveBranch(state, id, null, 0)) return false;
  card.docked = true;
  if (orderedCards(state, id).length) card.collapsed = true;
  return true;
}

export function restoreDockBranch(state, id, target) {
  const root = dockRoot(state, id);
  if (!root || root.id !== id || !target ||
      (target.parent && dockRoot(state, target.parent)) ||
      (target.anchorId && dockRoot(state, target.anchorId))) return false;
  if (!moveBranch(state, id, target.parent, target.column, target.anchorId, target.before)) return false;
  delete root.docked;
  return true;
}
