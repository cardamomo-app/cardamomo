import { importMarkdown } from './markdown-import-v2.mjs?v=dock1';

const invalid = () => new Error('This Cardamomo document is damaged or invalid. Your draft is unchanged.');

function cleanDocument(value) {
  if (!value || typeof value.title !== 'string' || !Array.isArray(value.cards) || !value.cards.length) throw invalid();
  const cards = value.cards.map(card => {
    if (!card || typeof card.id !== 'string' || !/^[\w-]{1,128}$/.test(card.id) ||
        typeof card.text !== 'string' || (card.parent !== null && typeof card.parent !== 'string') ||
        (card.column !== undefined && (!Number.isSafeInteger(card.column) || card.column < 0)) ||
        (card.collapsed !== undefined && typeof card.collapsed !== 'boolean') ||
        (card.docked !== undefined && (typeof card.docked !== 'boolean' || (card.docked && card.parent !== null)))) throw invalid();
    return { id: card.id, parent: card.parent, text: card.text,
      ...(card.column === undefined ? {} : { column: card.column }),
      ...(card.collapsed === undefined ? {} : { collapsed: card.collapsed }),
      ...(card.docked === undefined ? {} : { docked: card.docked }) };
  });
  const byId = new Map(cards.map(card => [card.id, card]));
  if (byId.size !== cards.length) throw invalid();
  // Validate every connection and reject cycles without recursive parsing.
  const complete = new Set();
  for (const card of cards) {
    const chain = new Set();
    let current = card;
    while (current && !complete.has(current.id)) {
      if (chain.has(current.id)) throw invalid();
      chain.add(current.id);
      if (current.parent === null) break;
      current = byId.get(current.parent);
      if (!current) throw invalid();
    }
    for (const id of chain) complete.add(id);
  }
  return { title: value.title, cards };
}

function cleanView(view = {}) {
  if (!view || typeof view !== 'object' || Array.isArray(view)) throw invalid();
  const { zoom = 1, scrollLeft = 0, scrollTop = 0 } = view;
  if (!Number.isFinite(zoom) || zoom < .5 || zoom > 1.5 ||
      !Number.isFinite(scrollLeft) || scrollLeft < 0 ||
      !Number.isFinite(scrollTop) || scrollTop < 0) throw invalid();
  return { zoom, scrollLeft, scrollTop };
}

export function serializeDocument(state, view) {
  return JSON.stringify({ format: 'cardamomo', version: state.cards.some(card=>card.docked) ? 2 : 1,
    document: cleanDocument(state), view: cleanView(view) }, null, 2) + '\n';
}

export function parseDocument(source) {
  let file;
  try { file = JSON.parse(source.replace(/^\uFEFF/, '')); } catch { throw invalid(); }
  if (!file || file.format !== 'cardamomo') throw invalid();
  if (![1, 2].includes(file.version)) throw new Error('This Cardamomo file uses an unsupported version. Please update Cardamomo before opening it.');
  return { state: cleanDocument(file.document), view: cleanView(file.view) };
}

export function openDocument(source, filename, lexer) {
  return /\.cardamomo$/i.test(filename)
    ? parseDocument(source)
    : { state: importMarkdown(source, filename, lexer), view: cleanView() };
}
