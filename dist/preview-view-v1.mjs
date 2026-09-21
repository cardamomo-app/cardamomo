import { orderedCards, depth, addCard, newCard } from './model-v3.mjs?v=split1';

export function previewCards(state) {
  return state.cards.filter(card => card.parent === null && !card.docked)
    .flatMap(card => [card, ...orderedCards(state, card.id)]);
}

// A gap belongs to the following card's sibling group, keeping its exact reading position.
// At the document end, use the last remaining card's sibling group.
export function previewGapTarget(state, beforeId = null, movingId = null) {
  const cards = previewCards(state);
  const moving = movingId ? new Set([movingId, ...orderedCards(state, movingId).map(card => card.id)]) : new Set();
  const following = beforeId === null ? null : cards.find(card => card.id === beforeId);
  if (beforeId !== null && (!following || moving.has(following.id) || moving.has(following.parent))) return null;
  const anchor = following || cards.filter(card => !moving.has(card.id)).at(-1);
  if (!anchor) return { parent: null, column: 0, anchorId: null, before: false, highlightId: null, mode: 'root' };
  if (moving.has(anchor.parent)) return null;
  return {parent: anchor.parent, column: depth(state, anchor), anchorId: anchor.id,
    before: !!following, highlightId: anchor.id, mode: 'sibling'};
}

export function previewDropTarget(state, movingId, y, rects) {
  const following = previewCards(state).find(card => {
    const rect = rects.get(card.id);
    return rect && y < (rect.top + rect.bottom) / 2;
  });
  return previewGapTarget(state, following?.id ?? null, movingId);
}

export function insertPreviewCard(state, beforeId = null) {
  const target = previewGapTarget(state, beforeId);
  if (!target) return null;
  if (target.anchorId) return addCard(state, target.anchorId, target.before ? 'before' : 'after');
  const card = newCard();state.cards.push(card);return card;
}

export function isPreviewShortcut(event, activeElement, dialogOpen = false) {
  const editable = element => element?.isContentEditable || element?.closest?.('input,textarea,select,[role="textbox"]');
  return event.key.toLowerCase() === 'p' && !event.metaKey && !event.ctrlKey && !event.altKey &&
    !event.isComposing && !event.repeat && !event.defaultPrevented && !dialogOpen &&
    !editable(event.target) && !editable(activeElement);
}
