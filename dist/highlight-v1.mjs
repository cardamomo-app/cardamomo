// Find a complete inline highlight, ignoring escaped markers and code spans.
export function highlightSpan(source) {
  if (!source.startsWith('==') || !source[2] || /[=\s]/.test(source[2])) return null;
  for (let i = 2; i < source.length; i++) {
    if (source[i] === '\n' || source[i] === '\r') return null;
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '`') {
      const run = source.slice(i).match(/^`+/)[0];
      const rest = source.slice(i + run.length).matchAll(/`+/g);
      let end = -1;
      for (const match of rest) if (match[0] === run) { end = i + run.length + match.index; break; }
      if (end !== -1 && !/[\r\n]/.test(source.slice(i, end))) { i = end + run.length - 1; continue; }
      i += run.length - 1;
    }
    if (source.startsWith('==', i) && source[i - 1] !== '=' && source[i + 2] !== '=' && !/\s/.test(source[i - 1])) {
      return { raw: source.slice(0, i + 2), text: source.slice(2, i) };
    }
  }
  return null;
}

export const highlightExtension = {
  extensions: [{
    name: 'highlight', level: 'inline',
    start(source) { return source.indexOf('=='); },
    tokenizer(source, tokens) {
      if (tokens.at(-1)?.raw?.endsWith('=')) return;
      const span = highlightSpan(source);
      if (span) return { type: 'highlight', ...span, tokens: this.lexer.inlineTokens(span.text) };
    },
    renderer(token) { return `<mark>${this.parser.parseInline(token.tokens)}</mark>`; },
  }],
};

export function toggleMarkdownHighlight(markdown) {
  return markdown.split('\n').map(line => {
    const [, leading, text, trailing] = line.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!text || /^=+$/.test(text)) return line;
    const span = highlightSpan(text);
    return leading + (span?.raw === text ? span.text : '==' + text + '==') + trailing;
  }).join('\n');
}

export function surroundingHighlight(before, selected, after) {
  const escapes = before.slice(0, -2).match(/\\+$/)?.[0].length || 0;
  if (!before.endsWith('==') || before.endsWith('===') || !after.startsWith('==') || after.startsWith('===') || escapes % 2) return { left: '', right: '' };
  const wrapped = '==' + selected + '==';
  return highlightSpan(wrapped)?.raw === wrapped ? { left: '==', right: '==' } : { left: '', right: '' };
}
