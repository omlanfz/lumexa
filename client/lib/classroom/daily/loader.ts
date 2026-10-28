// FILE PATH: client/lib/classroom/daily/loader.ts
//
// Getting hold of Daily: loading its library only when a classroom is opened
// (it is large, and the rest of the site never needs it), and owning THE call
// object. Daily allows one call object per page, and a classroom page makes it
// in an effect — which React runs twice in development, with the first run's
// cleanup in between. So the call object is shared and counted: it is created by
// the first `acquire`, handed to everyone who acquires it while it lives, and
// destroyed (which also leaves the meeting and lets go of the camera and
// microphone) only once everyone has released it and a moment has passed.

import type { DailyBrowserInfo, DailyCall } from '@daily-co/daily-js';

/** The part of Daily's factory the classroom uses (`Daily` itself fits). */
export interface DailyFactory {
  createCallObject(properties?: { subscribeToTracksAutomatically?: boolean }): DailyCall;
  getCallInstance(callClientId?: string): DailyCall | undefined;
  supportedBrowser(): DailyBrowserInfo;
}

let loading: Promise<DailyFactory> | null = null;

/** Daily's library, loaded once. */
export function loadDaily(): Promise<DailyFactory> {
  if (!loading) {
    loading = import('@daily-co/daily-js').then((m) => m.default as unknown as DailyFactory);
    // A failed load (offline) must not be remembered: the next try starts again.
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** What this browser can do with Daily, or null where Daily cannot run at all. */
export async function browserSupport(): Promise<DailyBrowserInfo | null> {
  try {
    return (await loadDaily()).supportedBrowser();
  } catch {
    return null;
  }
}

export interface CallManager {
  /** The shared call object, made if there is none. Pair every call with `release`. */
  acquire(): Promise<DailyCall>;
  /** Gives the call object back; it is destroyed once nobody holds it. */
  release(call: DailyCall): void;
}

export function createCallManager(load: () => Promise<DailyFactory>): CallManager {
  let shared: DailyCall | null = null;
  let creating: Promise<DailyCall> | null = null;
  let holders = 0;
  let destroyTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelDestroy = () => {
    if (destroyTimer !== null) clearTimeout(destroyTimer);
    destroyTimer = null;
  };

  const create = async (): Promise<DailyCall> => {
    const daily = await load();
    // One may already exist (another tab of the page's code made it).
    const existing = daily.getCallInstance();
    if (existing && !existing.isDestroyed()) return existing;
    return daily.createCallObject({ subscribeToTracksAutomatically: true });
  };

  return {
    async acquire() {
      holders++;
      cancelDestroy();
      try {
        if (shared && !shared.isDestroyed()) return shared;
        creating ??= create().finally(() => {
          creating = null;
        });
        shared = await creating;
        return shared;
      } catch (err) {
        holders--;
        throw err;
      }
    },

    release(call) {
      holders = Math.max(0, holders - 1);
      if (holders > 0) return;
      // Not at once: React's development double-mount releases and acquires again
      // within the same tick, and must find the same call object waiting.
      cancelDestroy();
      destroyTimer = setTimeout(() => {
        destroyTimer = null;
        if (holders > 0) return;
        if (shared === call) shared = null;
        if (!call.isDestroyed()) void call.destroy().catch(() => undefined);
      }, 0);
    },
  };
}

export const callManager: CallManager = createCallManager(loadDaily);
