'use client';

// A small floating explanation anchored to a pill. Desktop: appears on hover or
// keyboard focus. Touch: appears on tap and closes on the next tap anywhere
// else (or Escape) — it never relies on hover. It is rendered in a portal and
// positioned from the trigger's rectangle, clamped inside the viewport, so it
// can neither be clipped by the sticky navbar nor run off a 320px screen.

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface InfoPopoverProps {
  /** The text shown. */
  content: string;
  title?: string;
  /** The pill itself (a single <button>). */
  children: ReactNode;
  /** The pill's own click does something else (e.g. opens a dialog), so the
   * popover is hover/focus only: a click just gets it out of the way. */
  hoverOnly?: boolean;
  testId?: string;
}

const MARGIN = 12;
const WIDTH = 288;

export default function InfoPopover({ content, title, children, hoverOnly = false, testId }: InfoPopoverProps) {
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(WIDTH, vw - MARGIN * 2);
    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
    setPos({ top: r.bottom + 10, left, width });
  }, []);

  useLayoutEffect(() => {
    // Measuring the trigger is reading from the DOM, which is what a layout
    // effect is for.
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || wrapRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  return (
    <>
      <span
        ref={wrapRef}
        className="inline-flex"
        aria-describedby={open ? id : undefined}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
        // Keyboard focus only — a tap also focuses, and would fight the toggle.
        onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => (hoverOnly ? setOpen(false) : setOpen((v) => !v))}
      >
        {children}
      </span>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            id={id}
            role="tooltip"
            data-testid={testId}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="sp-pop-in z-[65] rounded-2xl border border-black/10 bg-white p-3.5 text-left text-xs leading-relaxed text-gray-700 shadow-xl dark:border-white/15 dark:bg-[#10162f] dark:text-gray-200"
          >
            {title && <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>}
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
