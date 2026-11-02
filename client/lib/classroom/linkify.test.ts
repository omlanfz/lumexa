import assert from 'node:assert/strict';
import test from 'node:test';
import { linkify } from './linkify.ts';

const links = (s: string) =>
  linkify(s)
    .filter((p) => p.type === 'link')
    .map((p) => (p.type === 'link' ? p.href : ''));

test('http and https links become links that open as typed', () => {
  assert.deepEqual(linkify('https://lumexa.com/class'), [
    { type: 'link', text: 'https://lumexa.com/class', href: 'https://lumexa.com/class' },
  ]);
  assert.deepEqual(links('go to http://example.org/a?b=1&c=2#top now'), ['http://example.org/a?b=1&c=2#top']);
});

test('text around a link is kept, and joining the parts gives the message back', () => {
  const message = 'Open https://meet.google.com/abc-defg-hij, then say hi!\nSecond line www.lumexa.com.';
  const parts = linkify(message);
  assert.equal(parts.map((p) => p.text).join(''), message);
  assert.deepEqual(links(message), ['https://meet.google.com/abc-defg-hij', 'https://www.lumexa.com/']);
});

test('www. and common bare addresses get https://', () => {
  assert.deepEqual(links('www.python.org'), ['https://www.python.org/']);
  assert.deepEqual(links('try scratch.mit.edu/projects/1 or github.com/lumexa/app'), [
    'https://scratch.mit.edu/projects/1',
    'https://github.com/lumexa/app',
  ]);
});

test('punctuation after a link belongs to the sentence, brackets only when balanced', () => {
  assert.deepEqual(links('(see https://a.com/x)'), ['https://a.com/x']);
  assert.deepEqual(links('is it https://a.com/x?'), ['https://a.com/x']);
  assert.deepEqual(links('"https://a.com/x",'), ['https://a.com/x']);
  assert.deepEqual(links('https://en.wikipedia.org/wiki/Foo_(bar)'), ['https://en.wikipedia.org/wiki/Foo_(bar)']);
});

test('things that only look a little like links are left as text', () => {
  for (const s of [
    'main.py',
    'index.html and style.css',
    'e.g. this',
    'Done.Me too',
    'Thanks.See you',
    'mail me at ada@gmail.com',
    'version 1.2.3',
    'file.txt',
    'v1.0',
    '3.14159',
    'localhost',
  ]) {
    assert.deepEqual(links(s), [], s);
  }
});

test('an email address is not turned into a link, even with a path-like tail', () => {
  assert.deepEqual(links('write to ada@lumexa.com/me'), []);
});

test('only http(s) links are ever produced', () => {
  for (const s of ['javascript:alert(1)', 'ftp://files.example.com/a', 'data:text/html;base64,AAAA', 'file:///etc/passwd']) {
    for (const href of links(s)) assert.match(href, /^https?:\/\//, s);
  }
  assert.deepEqual(links('javascript:alert(1)//example.com'), []);
});

test('a message with several links finds each one, and text without links is one text part', () => {
  assert.deepEqual(links('https://a.com and https://b.com/c'), ['https://a.com/', 'https://b.com/c']);
  assert.deepEqual(linkify('just words'), [{ type: 'text', text: 'just words' }]);
  assert.deepEqual(linkify(''), []);
});

test('very long links are still one link', () => {
  const long = `https://example.com/${'a'.repeat(400)}`;
  assert.deepEqual(links(long), [long]);
});
