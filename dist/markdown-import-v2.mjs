import { newCard } from './model-v3.mjs';

export function importMarkdown(source, filename, lexer) {
  if (typeof source !== 'string') throw new Error('The file could not be read as text.');
  const markdown = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (markdown.includes('\0')) throw new Error('Choose a Markdown text file.');
  const title = filename.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '').trim() || 'Untitled';
  const headings = [];
  let cursor = 0;
  // Only top-level Markdown heading tokens count. Fenced code, quoted headings,
  // and list contents cannot accidentally become cards. Slice the original
  // source so definitions omitted by the lexer are preserved too.
  for (const token of lexer(markdown)) {
    if (!token.raw) continue;
    const offset = markdown.indexOf(token.raw, cursor);
    if (offset < 0) throw new Error('This file could not be divided into headings.');
    cursor = offset + token.raw.length;
    if (token.type === 'heading') headings.push({ offset, level: token.depth });
  }
  if (!headings.length) {
    const card = newCard(); card.text = markdown.trim();
    return { title, cards: [card] };
  }
  const levels = [...new Set(headings.map(h => h.level))].sort((a, b) => a - b);
  const cards = [], stack = [];
  const introduction = markdown.slice(0, headings[0].offset).trim();
  if (introduction) { const card = newCard(null, 0); card.text = introduction; cards.push(card); }
  headings.forEach((heading, index) => {
    while (stack.length && stack.at(-1).level >= heading.level) stack.pop();
    const card = newCard(stack.at(-1)?.id || null, levels.indexOf(heading.level));
    card.text = markdown.slice(heading.offset, headings[index + 1]?.offset ?? markdown.length).trim();
    cards.push(card);
    stack.push({ id: card.id, level: heading.level });
  });
  return { title, cards };
}
