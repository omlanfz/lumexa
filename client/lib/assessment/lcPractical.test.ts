import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkSelectedFiles, cleanLinks, extensionOf, isHttps } from './lcPractical';

describe('isHttps', () => {
  it('accepts full https addresses only', () => {
    assert.equal(isHttps('https://scratch.mit.edu/projects/123/'), true);
    assert.equal(isHttps('  https://stretch3.github.io/  '), true);
    for (const bad of ['http://scratch.mit.edu', 'javascript:alert(1)', 'scratch.mit.edu', 'ftp://x.org', 'data:text/html,hi', 'https://', 'https://a b.com', '', `https://a.org/${'x'.repeat(600)}`]) {
      assert.equal(isHttps(bad), false, bad);
    }
  });
});

describe('cleanLinks', () => {
  it('keeps the valid ones, trimmed and without repeats', () => {
    assert.deepEqual(cleanLinks([' https://a.org/1 ', '', 'http://nope.org', 'https://a.org/1', 'https://b.org']), ['https://a.org/1', 'https://b.org']);
  });
  it('never sends more than the limit', () => {
    assert.equal(cleanLinks(Array.from({ length: 9 }, (_, i) => `https://a.org/${i}`), 5).length, 5);
  });
});

describe('checkSelectedFiles', () => {
  const opts = { existing: 0, maxFiles: 8, maxFileMb: 15 };
  const mb = 1024 * 1024;
  it('lets good files through', () => {
    assert.equal(checkSelectedFiles([{ name: 'rocket.sb3', size: 2 * mb }, { name: 'shot.PNG', size: 1000 }], opts), null);
    assert.equal(checkSelectedFiles([], opts), null);
  });
  it('refuses a kind that cannot be handed in', () => {
    assert.match(checkSelectedFiles([{ name: 'virus.exe', size: 10 }], opts)!, /can't be handed in/);
    assert.match(checkSelectedFiles([{ name: 'noextension', size: 10 }], opts)!, /can't be handed in/);
  });
  it('refuses empty and oversize files', () => {
    assert.match(checkSelectedFiles([{ name: 'a.py', size: 0 }], opts)!, /empty/);
    assert.match(checkSelectedFiles([{ name: 'a.sb3', size: 16 * mb }], opts)!, /bigger than 15 MB/);
  });
  it('counts what is already there', () => {
    assert.match(checkSelectedFiles([{ name: 'a.py', size: 5 }, { name: 'b.py', size: 5 }], { ...opts, existing: 7 })!, /1 more file/);
    assert.match(checkSelectedFiles([{ name: 'a.py', size: 5 }], { ...opts, existing: 8 })!, /most files you can/);
  });
  it('one bad file stops the whole batch', () => {
    assert.ok(checkSelectedFiles([{ name: 'ok.py', size: 5 }, { name: 'bad.exe', size: 5 }], opts));
  });
  it('reads extensions the way the server does', () => {
    assert.equal(extensionOf('My.Project.SB3'), 'sb3');
    assert.equal(extensionOf('README'), '');
  });
});
