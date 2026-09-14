import TurndownService from './assets/turndown-7.2.4.mjs';
import { createMarkdownEditor } from './native-editor-v1.mjs';

const converter = new TurndownService({
  headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced',
  emDelimiter: '*', strongDelimiter: '**'
});
converter.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: content => content.trim() ? `~~${content}~~` : content
});

// Read formatting from an inert, sanitized copy. Source HTML never enters the editor.
export function clipboardMarkdown(data, sanitize = html => DOMPurify.sanitize(html, {
  RETURN_DOM: true,
  FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'button', 'select',
    'textarea', 'svg', 'math', 'noscript', 'img', 'canvas', 'video', 'audio', 'object', 'embed']
})) {
  const plain = data.getData('text/plain').replace(/\r\n?/g, '\n');
  const html = data.getData('text/html');
  if (!html) return plain;
  const root = sanitize(html);
  // Some editors wrap an entire selection in <b style="font-weight:normal">.
  for (const node of root.querySelectorAll('b,strong,i,em')) {
    const weight = node.style.fontWeight, style = node.style.fontStyle;
    if ((['B', 'STRONG'].includes(node.tagName) && (weight === 'normal' || (weight && Number(weight) < 600))) ||
        (['I', 'EM'].includes(node.tagName) && style === 'normal')) {
      const span = node.ownerDocument.createElement('span');
      span.style.cssText = node.style.cssText;
      span.append(...node.childNodes);node.replaceWith(span);
    }
  }
  for (const node of root.querySelectorAll('*')) {
    if (node.closest('pre,code')) continue;
    const weight = node.style.fontWeight;
    const wrappers = [
      [(weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) && !node.closest('b,strong'), 'strong'],
      [/^(italic|oblique)/.test(node.style.fontStyle) && !node.closest('i,em'), 'em'],
      [/line-through/.test(node.style.textDecorationLine || node.style.textDecoration) && !node.closest('del,s,strike'), 'del']
    ];
    for (const [needed, tag] of wrappers) if (needed) {
      const wrapper = node.ownerDocument.createElement(tag);
      wrapper.append(...node.childNodes);node.append(wrapper);
    }
  }
  // Plain Markdown copied from another editor often has incidental HTML wrappers.
  // Keep its literal markers instead of escaping them as rich-text punctuation.
  if (plain && !root.querySelector('strong,b,em,i,ul,ol,h1,h2,h3,h4,h5,h6,pre,code,blockquote,a[href],hr,del,s,strike,table')) return plain;
  return converter.turndown(root) || plain;
}

export function pasteMarkdown(editor, event) {
  if (!event.clipboardData) return false;
  const doc = editor.ownerDocument, selection = doc.getSelection();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  event.preventDefault();
  let markdown;
  try { markdown = clipboardMarkdown(event.clipboardData); }
  catch { markdown = event.clipboardData.getData('text/plain'); }
  if (!markdown) return false;
  // A native insertion keeps the paste in the browser's typing undo history.
  return markdown.includes('\n')
    ? doc.execCommand('insertHTML', false, createMarkdownEditor(markdown, doc).innerHTML)
    : doc.execCommand('insertText', false, markdown);
}
