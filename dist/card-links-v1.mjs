import { orderedCards } from './model-v3.mjs';
import { inlineLink } from './link-v1.mjs';

export function cardLinkTarget(state, destination) {
  if (/^\d+$/.test(destination)) return orderedCards(state)[Number(destination) - 1]?.id || null;
  if (/^#card-[\w-]+$/.test(destination)) return state.cards.find(card => '#card-' + card.id === destination)?.id || null;
  return null;
}

export function isCardLink(destination) {
  return /^\d+$/.test(destination) || /^#card-[\w-]+$/.test(destination);
}

// Edit only parsed inline-link destinations. Code, images, HTML, and ordinary
// text must never be rewritten just because they contain link-like characters.
function rewrite(source, tokens, destination) {
  let result = '', cursor = 0;
  for (const token of tokens) {
    if (!token.raw) continue;
    const at = source.indexOf(token.raw, cursor);
    if (at < 0) continue;
    let replacement = token.raw;
    if (token.type === 'link') {
      const link = inlineLink(token.raw), next = destination(token.href);
      if (link && next !== token.href) {
        const start = link.label.length + 3;
        const suffix = token.raw.slice(start);
        const match = suffix.match(/^(\s*)(?:<([^>]*)>|([^\s)]*))/);
        if (match && (match[2] ?? match[3]) === token.href) {
          replacement = token.raw.slice(0, start) + match[1] + next + suffix.slice(match[0].length);
        }
      }
    } else if (!['code', 'codespan', 'html', 'image'].includes(token.type)) {
      const children = token.tokens || token.items ||
        [...(token.header || []), ...(token.rows || []).flat()].flatMap(cell => cell.tokens || []);
      if (children.length) replacement = rewrite(token.raw, children, destination);
    }
    result += source.slice(cursor, at) + replacement;
    cursor = at + token.raw.length;
  }
  return result + source.slice(cursor);
}

export function storeCardLinks(text, state, lexer) {
  return rewrite(text, lexer(text), href => {
    if (!/^\d+$/.test(href)) return href;
    const id = cardLinkTarget(state, href);
    return id ? '#card-' + id : href;
  });
}

export function displayCardLinks(text, state, lexer) {
  const numbers = new Map(orderedCards(state).map((card, index) => ['#card-' + card.id, String(index + 1)]));
  return rewrite(text, lexer(text), href => numbers.get(href) || href);
}
