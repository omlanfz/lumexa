import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEARTBEAT_STALE_MS,
  clearTestTabHeartbeat,
  isTestTabOpen,
  openTestTab,
  resetTestTabs,
  testTabName,
  testTabUrl,
  writeTestTabHeartbeat,
} from './testTab.ts';

function fakeBrowser() {
  const opened: { url: string; target: string; win: { closed: boolean; focused: number; focus(): void } }[] = [];
  let block = false;
  return {
    opened,
    block: (v: boolean) => (block = v),
    win: {
      open(url: string, target: string) {
        if (block) return null;
        const w = { closed: false, focused: 0, focus() { this.focused++; } };
        opened.push({ url, target, win: w });
        return w;
      },
    },
  };
}

function fakeStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

test('the test opens in a new tab at its own address, started automatically', () => {
  resetTestTabs();
  const b = fakeBrowser();
  assert.equal(openTestTab('sl-1', { autostart: true }, b.win), 'opened');
  assert.deepEqual(b.opened.map((o) => [o.url, o.target]), [['/assessment/sl-1?autostart=1', 'lumexa-test-sl-1']]);
  assert.equal(b.opened[0].win.focused, 1);
});

test('without autostart the address has no query', () => {
  assert.equal(testTabUrl('sl-1'), '/assessment/sl-1');
  assert.equal(testTabUrl('a b/c', { autostart: true }), '/assessment/a%20b%2Fc?autostart=1');
  assert.equal(testTabName('sl-1'), 'lumexa-test-sl-1');
});

test('pressing the button again goes back to the same tab instead of opening another', () => {
  resetTestTabs();
  const b = fakeBrowser();
  openTestTab('sl-1', { autostart: true }, b.win);
  assert.equal(openTestTab('sl-1', {}, b.win), 'focused');
  assert.equal(b.opened.length, 1);
  assert.equal(b.opened[0].win.focused, 2);
});

test('if the tab was closed, a fresh one is opened', () => {
  resetTestTabs();
  const b = fakeBrowser();
  openTestTab('sl-1', { autostart: true }, b.win);
  b.opened[0].win.closed = true;
  assert.equal(openTestTab('sl-1', {}, b.win), 'opened');
  assert.equal(b.opened.length, 2);
  // Reopening an attempt in progress must not ask to start a new one.
  assert.equal(b.opened[1].url, '/assessment/sl-1');
});

test('a blocked pop-up is reported, not mistaken for an open tab', () => {
  resetTestTabs();
  const b = fakeBrowser();
  b.block(true);
  assert.equal(openTestTab('sl-1', { autostart: true }, b.win), 'blocked');
  b.block(false);
  assert.equal(openTestTab('sl-1', { autostart: true }, b.win), 'opened');
});

test('different tests keep their own tabs', () => {
  resetTestTabs();
  const b = fakeBrowser();
  openTestTab('sl-1', {}, b.win);
  assert.equal(openTestTab('sl-2', {}, b.win), 'opened');
  assert.equal(b.opened.length, 2);
});

test('the classroom can tell whether the test tab is alive', () => {
  const store = fakeStore();
  assert.equal(isTestTabOpen('sl-1', 10_000, store), false);
  writeTestTabHeartbeat('sl-1', 10_000, store);
  assert.equal(isTestTabOpen('sl-1', 11_500, store), true);
  assert.equal(isTestTabOpen('sl-1', 10_000 + HEARTBEAT_STALE_MS + 1, store), false);
  assert.equal(isTestTabOpen('sl-2', 10_500, store), false);
  clearTestTabHeartbeat('sl-1', store);
  assert.equal(isTestTabOpen('sl-1', 10_500, store), false);
});

test('a heartbeat that cannot be read or written never throws', () => {
  const broken = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };
  assert.doesNotThrow(() => writeTestTabHeartbeat('sl-1', 1, broken));
  assert.doesNotThrow(() => clearTestTabHeartbeat('sl-1', broken));
  assert.equal(isTestTabOpen('sl-1', 1, broken), false);
});

test('garbage in the store is not "open"', () => {
  const store = fakeStore();
  store.data.set('lumexa:test-tab:sl-1', 'soon');
  assert.equal(isTestTabOpen('sl-1', 5, store), false);
});
