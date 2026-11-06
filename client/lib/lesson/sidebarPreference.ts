// FILE PATH: client/lib/lesson/sidebarPreference.ts
//
// Whether the lesson page's contents sidebar ("On this page") is open. A per-device
// convenience: remembered in localStorage so it stays as the reader left it on every
// lesson and for every role (student, teacher, admin), and kept in memory when storage
// is blocked (private windows) so the button still works for the rest of the visit.
//
// Plain functions with a subscribe(), so React can read it with useSyncExternalStore
// (server render and first paint: open; then the stored choice, with no mismatch).

export const SIDEBAR_STORAGE_KEY = 'lumexa:lesson-sidebar';

const listeners = new Set<() => void>();
/** The choice made in this tab while storage may not be writable (null: ask storage). */
let memory: boolean | null = null;

function readStored(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'hidden';
  } catch {
    return true; // storage blocked: default to open
  }
}

/** True when the sidebar should be shown. */
export function getSidebarOpen(): boolean {
  return memory ?? readStored();
}

export function setSidebarOpen(open: boolean): void {
  memory = open;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? 'open' : 'hidden');
    } catch {
      /* the in-memory choice still applies for this visit */
    }
  }
  listeners.forEach((l) => l());
}

/** Calls `onChange` when the choice changes here or in another tab. Returns the unsubscribe. */
export function subscribeSidebar(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SIDEBAR_STORAGE_KEY || e.key === null) {
      memory = null; // another tab changed it (or storage was cleared): trust storage again
      onChange();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** Test seam: forget the in-memory choice. */
export function resetSidebarPreferenceForTests(): void {
  memory = null;
  listeners.clear();
}
