import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownEditor, readMarkdownEditor } from '../dist/native-editor-v1.mjs';

// Minimal DOM nodes let serialization run without a browser or keyboard mocks.
function element(name, ...children) {
  return {
    nodeName: name.toUpperCase(), nodeType: 1, dataset: {}, childNodes: children,
    setAttribute() {}, append(child) { this.childNodes.push(child); },
    get lastChild() { return this.childNodes.at(-1); }
  };
}
const text = value => ({ nodeType: 3, nodeName: '#text', nodeValue: value });
const doc = { createElement: element, createTextNode: text };

test('existing Markdown survives opening and saving the native editor', () => {
  for (const markdown of [
    '', 'One\n\nTwo', '# Heading\n\n**bold** and *italic*',
    '- first\n- second', '```js\nconst a = 1;\n\nconsole.log(a);\n```',
    'One  \nTwo', 'One\n', '\n\n', '[link](https://example.com)',
    '<script>alert("text only")</script>'
  ]) assert.equal(readMarkdownEditor(createMarkdownEditor(markdown, doc)), markdown);
});

test('native paragraphs become Markdown paragraphs', () => {
  assert.equal(readMarkdownEditor(element('div',
    element('p', text('First')), element('p', text('Second'))
  )), 'First\n\nSecond');
});

test('native Shift Enter becomes a Markdown hard break', () => {
  assert.equal(readMarkdownEditor(element('div', element('p', text('First\nSecond')))), 'First  \nSecond');
  assert.equal(readMarkdownEditor(element('div', element('p', text('First'), element('br'), text('Second')))), 'First  \nSecond');
  assert.equal(readMarkdownEditor(element('div', element('p', text('First'), element('br'), element('br')))), 'First  \n');
});

test('browser caret placeholders are excluded, including after Select All and Delete', () => {
  assert.equal(readMarkdownEditor(element('div', element('br'))), '');
  assert.equal(readMarkdownEditor(element('div', element('p', element('br')))), '');
  assert.equal(readMarkdownEditor(element('div', text('First'), element('div', text('Second')))), 'First\n\nSecond');
});
