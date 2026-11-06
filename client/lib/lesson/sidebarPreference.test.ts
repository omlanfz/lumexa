import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  SIDEBAR_STORAGE_KEY,
  getSidebarOpen,
  resetSidebarPreferenceForTests,
  setSidebarOpen,
  subscribeSidebar,
} from './sidebarPreference';

type Listener = (e: { key: string | null }) => void;

function installWindow(opts: { blocked?: boolean } = {}) {
  const store = new Map<string, string>();
  const handlers = new Set<Listener>();
  const localStorage = {
    getItem: (k: string) => {
      if (opts.blocked) throw new Error('blocked');
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.blocked) throw new Error('blocked');
      store.set(k, v);
    },
  };
  const win = {
    localStorage,
    addEventListener: (_: string, h: Listener) => handlers.add(h),
    removeEventListener: (_: string, h: Listener) => handlers.delete(h),
  };
  (globalThis as unknown as { window: unknown }).window = win;
  return { store, handlers };
}

describe('lesson sidebar preference', () => {
  beforeEach(() => resetSidebarPreferenceForTests());
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('is open by default, including where there is no window (server render)', () => {
    assert.equal(getSidebarOpen(), true);
    installWindow();
    resetSidebarPreferenceForTests();
    assert.equal(getSidebarOpen(), true);
  });

  it('remembers hiding it, and reopening it', () => {
    const { store } = installWindow();
    setSidebarOpen(false);
    assert.equal(getSidebarOpen(), false);
    assert.equal(store.get(SIDEBAR_STORAGE_KEY), 'hidden');
    // a fresh page load reads the stored choice
    resetSidebarPreferenceForTests();
    assert.equal(getSidebarOpen(), false);
    setSidebarOpen(true);
    assert.equal(getSidebarOpen(), true);
    assert.equal(store.get(SIDEBAR_STORAGE_KEY), 'open');
  });

  it('tells subscribers about every change, and stops after unsubscribe', () => {
    installWindow();
    let calls = 0;
    const off = subscribeSidebar(() => calls++);
    setSidebarOpen(false);
    setSidebarOpen(true);
    assert.equal(calls, 2);
    off();
    setSidebarOpen(false);
    assert.equal(calls, 2);
  });

  it('follows a change made in another tab', () => {
    const { store, handlers } = installWindow();
    setSidebarOpen(true);
    let calls = 0;
    const off = subscribeSidebar(() => calls++);
    store.set(SIDEBAR_STORAGE_KEY, 'hidden'); // the other tab wrote this
    handlers.forEach((h) => h({ key: SIDEBAR_STORAGE_KEY }));
    assert.equal(calls, 1);
    assert.equal(getSidebarOpen(), false);
    // an unrelated key is ignored
    handlers.forEach((h) => h({ key: 'something-else' }));
    assert.equal(calls, 1);
    off();
    assert.equal(handlers.size, 0, 'the storage listener is removed');
  });

  it('still works for the visit when storage is blocked', () => {
    installWindow({ blocked: true });
    assert.equal(getSidebarOpen(), true);
    setSidebarOpen(false);
    assert.equal(getSidebarOpen(), false, 'the in-memory choice applies');
    setSidebarOpen(true);
    assert.equal(getSidebarOpen(), true);
  });
});
