'use client';

// The student's navbar data (class credits + rank), straight from the backend.
// It is re-read every minute, whenever the tab becomes visible again and
// whenever the route changes — so a payment, refund or correction an admin
// makes, or a class that has just finished, reaches the navbar without the
// student reloading anything.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/axios';
import type { NavSummary } from '@/lib/student/progress';

const POLL_MS = 60_000;

export function useNavSummary(): { summary: NavSummary | null; refresh: () => void } {
  const [summary, setSummary] = useState<NavSummary | null>(null);
  const pathname = usePathname();
  const alive = useRef(true);
  // Only the newest request may update the pills: two refreshes fired close
  // together (a tab focus and a navigation) must not let the older answer
  // land last and show a stale balance.
  const latest = useRef(0);

  const refresh = useCallback(() => {
    const seq = ++latest.current;
    api
      .get<NavSummary>('/students/me/nav-summary')
      .then((res) => alive.current && seq === latest.current && setSummary(res.data))
      // Keep showing the last known values if a refresh fails.
      .catch(() => {});
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // On mount and on every navigation.
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return { summary, refresh };
}
