import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallManager } from './loader.ts';
import type { DailyFactory } from './loader.ts';
import type { DailyCall } from '@daily-co/daily-js';

function fakeFactory() {
  const created: { destroyed: boolean; destroy: () => Promise<void> }[] = [];
  let existing: DailyCall | undefined;
  const factory: DailyFactory = {
    createCallObject: () => {
      if (created.some((c) => !c.destroyed)) throw new Error('Duplicate DailyIframe instances are not allowed');
      const call = {
        destroyed: false,
        isDestroyed() {
          return this.destroyed;
        },
        async destroy() {
          this.destroyed = true;
        },
      };
      created.push(call);
      return call as unknown as DailyCall;
    },
    getCallInstance: () => existing,
    supportedBrowser: () => ({}) as never,
  };
  return {
    factory,
    created,
    setExisting: (call: DailyCall | undefined) => {
      existing = call;
    },
  };
}

const later = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

test('the first acquire makes the call object, and everyone after shares it', async () => {
  const { factory, created } = fakeFactory();
  const manager = createCallManager(async () => factory);
  const a = await manager.acquire();
  const b = await manager.acquire();
  assert.equal(a, b);
  assert.equal(created.length, 1);
});

test('two acquires in flight at once still make only one (React’s development double mount)', async () => {
  const { factory, created } = fakeFactory();
  const manager = createCallManager(async () => factory);
  const [a, b] = await Promise.all([manager.acquire(), manager.acquire()]);
  assert.equal(a, b);
  assert.equal(created.length, 1);
});

test('the call object is destroyed only after everyone has let go — and not instantly', async () => {
  const { factory, created } = fakeFactory();
  const manager = createCallManager(async () => factory);
  const call = await manager.acquire();
  await manager.acquire();
  manager.release(call);
  await later();
  assert.equal(created[0].destroyed, false, 'one holder is left');
  manager.release(call);
  assert.equal(created[0].destroyed, false, 'not in the same tick');
  await later();
  assert.equal(created[0].destroyed, true);
});

test('a release and an acquire in the same tick find the same call waiting (cleanup, then mount again)', async () => {
  const { factory, created } = fakeFactory();
  const manager = createCallManager(async () => factory);
  const first = await manager.acquire();
  manager.release(first);
  const second = await manager.acquire();
  await later();
  assert.equal(second, first);
  assert.equal(created[0].destroyed, false);
  assert.equal(created.length, 1);
});

test('after a call object is destroyed the next acquire makes a new one', async () => {
  const { factory, created } = fakeFactory();
  const manager = createCallManager(async () => factory);
  const first = await manager.acquire();
  manager.release(first);
  await later();
  const second = await manager.acquire();
  assert.notEqual(second, first);
  assert.equal(created.length, 2);
});

test('a call object that already exists on the page is used rather than a second one', async () => {
  const { factory, created, setExisting } = fakeFactory();
  const mine = { isDestroyed: () => false, destroy: async () => undefined } as unknown as DailyCall;
  setExisting(mine);
  const manager = createCallManager(async () => factory);
  assert.equal(await manager.acquire(), mine);
  assert.equal(created.length, 0);
});

test('if Daily cannot be loaded the failure is passed on, and holding it is not counted', async () => {
  let fail = true;
  const { factory, created } = fakeFactory();
  const manager = createCallManager(async () => {
    if (fail) throw new Error('offline');
    return factory;
  });
  await assert.rejects(manager.acquire(), /offline/);
  fail = false;
  const call = await manager.acquire();
  manager.release(call);
  await later();
  assert.equal(created[0].destroyed, true, 'one holder, released: destroyed');
});
