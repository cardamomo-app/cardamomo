import test from 'node:test';
import assert from 'node:assert/strict';
import { clipboardLink, inlineLink } from '../dist/link-v1.mjs';

test('clipboard uses only complete web addresses and escapes Markdown delimiters', () => {
  assert.equal(clipboardLink(' https://example.com/page?q=1#part '), 'https://example.com/page?q=1#part');
  assert.equal(clipboardLink('www.example.com'), 'https://www.example.com/');
  assert.equal(clipboardLink('https://example.com/a(b)'), 'https://example.com/a%28b%29');
  for (const text of ['', 'words', 'https://', 'https://a.test/ two', 'javascript:alert(1)', 'data:text/plain,hi']) {
    assert.equal(clipboardLink(text), '');
  }
});

test('inline links recognize labels, empty destinations, nested parentheses, and escapes', () => {
  for (const text of ['[word]()', '[word](https://example.com)', '[word](https://a.test/a(b))', '[word](<https://a.test/a(b)>)', '[word](https://a.test "title")']) {
    assert.deepEqual(inlineLink(text), {label:'word',length:text.length});
  }
  assert.deepEqual(inlineLink('[a [b]](url)'), {label:'a [b]',length:12});
  assert.deepEqual(inlineLink('[a\\]b](url)'), {label:'a\\]b',length:11});
  assert.deepEqual(inlineLink('[](url) after'), {label:'',length:7});
  for (const text of ['text', '![alt](url)', '[word][ref]', '[word](broken']) assert.equal(inlineLink(text), null);
});
