'use client';

// FILE PATH: client/components/lesson/hooks.ts
//
// Scroll-driven behaviour for the lesson page: which heading is "current", whether a
// section has genuinely been read, and how far down the lesson the reader is.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { getSidebarOpen, setSidebarOpen, subscribeSidebar } from '@/lib/lesson/sidebarPreference';

/** How long the end of a section must stay on screen before it counts as read. */
export const READ_DWELL_MS = 1500;

/** The id of the heading nearest the top of the reading area. */
export function useActiveHeading(ids: string[], enabled: boolean, root?: Element | null): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');
  useEffect(() => {
    if (!enabled || ids.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        if (visible.size > 0) setActive([...visible.entries()].sort((a, b) => a[1] - b[1])[0][0]);
      },
      { root: root ?? null, rootMargin: '-80px 0px -65% 0px', threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, root]);
  return active;
}

/**
 * Calls `onRead(id)` once the sentinel at the END of a section has been on screen for
 * READ_DWELL_MS — i.e. the reader reached the end and stayed, not merely scrolled past
 * or opened the page. A collapsed section has no visible end, so it is never read.
 */
export function useReadTracking(sectionIds: string[], enabled: boolean, onRead: (id: string) => void, root?: Element | null) {
  const cb = useRef(onRead);
  cb.current = onRead;
  const key = sectionIds.join('|');
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.sectionEnd;
          if (!id) continue;
          if (e.isIntersecting) {
            if (!timers.has(id)) {
              timers.set(
                id,
                setTimeout(() => {
                  timers.delete(id);
                  cb.current(id);
                }, READ_DWELL_MS),
              );
            }
          } else {
            const t = timers.get(id);
            if (t) {
              clearTimeout(t);
              timers.delete(id);
            }
          }
        }
      },
      { root: root ?? null, threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    sectionIds.forEach((id) => {
      const el = document.querySelector(`[data-section-end="${CSS.escape(id)}"]`);
      if (el) io.observe(el);
    });
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, root]);
}

/** 0–1: how far through `target` the reader has scrolled. */
export function useScrollProgress(target: RefObject<HTMLElement | null>, enabled: boolean, scroller?: HTMLElement | null): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = target.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = scroller ? scroller.clientHeight : window.innerHeight;
      const top = scroller ? rect.top - scroller.getBoundingClientRect().top : rect.top;
      const total = rect.height - viewport;
      setP(total <= 0 ? (top < 0 ? 1 : 0) : Math.max(0, Math.min(1, -top / total)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const host: HTMLElement | Window = scroller ?? window;
    host.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    tick();
    return () => {
      host.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, enabled, scroller]);
  return p;
}

/**
 * Whether the contents sidebar is open, and a setter. Open for the server render and the
 * first paint, then the reader's remembered choice (shared by every lesson, every role).
 */
export function useLessonSidebar(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(subscribeSidebar, getSidebarOpen, () => true);
  const set = useCallback((next: boolean) => setSidebarOpen(next), []);
  return [open, set];
}
