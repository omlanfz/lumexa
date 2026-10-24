// FILE PATH: client/lib/assessment/testTab.ts
//
// The test is taken in its OWN browser tab. Students share their whole screen
// while they sit it so the teacher can watch, and a screen share takes over the
// classroom's stage — a test living inside the classroom would vanish the moment
// anyone shared. A separate tab is never affected by what the classroom shows.
//
// This module opens (or goes back to) that tab and tells the classroom tab
// whether it is open. No React; the browser objects are passed in, so it is
// unit-tested with Node's test runner.

export const testTabPath = (scheduledLessonId: string) => `/assessment/${encodeURIComponent(scheduledLessonId)}`;

/** `autostart` makes the new tab create the attempt as soon as it has loaded,
 *  so one click on "Start test" is all it takes and the stopwatch begins at 00. */
export const testTabUrl = (scheduledLessonId: string, opts: { autostart?: boolean } = {}) =>
  `${testTabPath(scheduledLessonId)}${opts.autostart ? '?autostart=1' : ''}`;

/** A fixed window name: opening the test again reuses its tab instead of
 *  piling up copies. */
export const testTabName = (scheduledLessonId: string) => `lumexa-test-${scheduledLessonId}`;

export type OpenResult = 'opened' | 'focused' | 'blocked';

interface TabWindow {
  closed: boolean;
  focus(): void;
}
interface Opener {
  open(url: string, target: string): TabWindow | null;
}

// The tabs this page has opened, by test. Kept so "Go to my test tab" can
// simply focus it rather than navigate it again.
const handles = new Map<string, TabWindow>();

/** Open the test tab — or, if it is already open, bring it to the front.
 *  MUST be called straight from the click handler: browsers only allow a new tab
 *  as the direct result of a click. */
export function openTestTab(scheduledLessonId: string, opts: { autostart?: boolean } = {}, win: Opener = window): OpenResult {
  const existing = handles.get(scheduledLessonId);
  if (existing && !existing.closed) {
    existing.focus();
    return 'focused';
  }
  // (No "noopener": it would make window.open return null, and then a blocked
  // pop-up could not be told apart from an opened tab. The page is ours.)
  const opened = win.open(testTabUrl(scheduledLessonId, opts), testTabName(scheduledLessonId));
  if (!opened) {
    handles.delete(scheduledLessonId);
    return 'blocked';
  }
  handles.set(scheduledLessonId, opened);
  opened.focus();
  return 'opened';
}

/** Forget remembered tabs (tests). */
export function resetTestTabs() {
  handles.clear();
}

// ── Is the test tab open? ───────────────────────────────────────────────────
// The test tab writes a heartbeat to localStorage every couple of seconds; the
// classroom tab (same browser, same site) reads it to say "your test is open in
// another tab" — or "your test tab was closed".

export const HEARTBEAT_EVERY_MS = 2_000;
export const HEARTBEAT_STALE_MS = 7_000;

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const heartbeatKey = (scheduledLessonId: string) => `lumexa:test-tab:${scheduledLessonId}`;

export function writeTestTabHeartbeat(scheduledLessonId: string, now: number, store: KeyValueStore): void {
  try {
    store.setItem(heartbeatKey(scheduledLessonId), String(now));
  } catch {
    // storage blocked — the classroom just can't tell; nothing depends on it
  }
}

export function clearTestTabHeartbeat(scheduledLessonId: string, store: KeyValueStore): void {
  try {
    store.removeItem(heartbeatKey(scheduledLessonId));
  } catch {
    /* ignore */
  }
}

export function isTestTabOpen(scheduledLessonId: string, now: number, store: KeyValueStore): boolean {
  try {
    const raw = store.getItem(heartbeatKey(scheduledLessonId));
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && now - at < HEARTBEAT_STALE_MS && now - at > -HEARTBEAT_STALE_MS;
  } catch {
    return false;
  }
}
