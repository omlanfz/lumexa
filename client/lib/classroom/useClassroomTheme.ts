// FILE PATH: client/lib/classroom/useClassroomTheme.ts
//
// The classroom's OWN light/dark toggle — deliberately separate from the
// rest of the site's theme system. Light is the default. Persisted to
// localStorage only: never written to room metadata or broadcast over the
// data channel, so it can never leak to (or be forced by) another
// participant — each browser remembers its own choice, that's the whole
// point.

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lumexa-classroom-theme';

export type ClassroomTheme = 'light' | 'dark';

function readStored(): ClassroomTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useClassroomTheme() {
  // Lazy initializer, not an effect: ClassroomRoom is only ever mounted
  // client-side (behind an async join step, never server-rendered), so
  // there's no SSR/hydration mismatch to guard against here.
  const [theme, setTheme] = useState<ClassroomTheme>(readStored);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private browsing / storage disabled — the toggle still works for
        // the rest of this session, it just won't be remembered next time.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
