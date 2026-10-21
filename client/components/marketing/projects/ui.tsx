"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Emoji confetti. Pass a counter that you bump to fire it again. */
export function Burst({
  n,
  emojis = ["✨", "🎉", "⭐"],
  count = 10,
}: {
  n: number;
  emojis?: string[];
  count?: number;
}) {
  if (!n) return null;
  return (
    <div
      key={n}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + (n % 7) * 0.35;
        const d = 70 + ((i * 37 + n * 13) % 55);
        const style = { "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d}px` } as CSSProperties;
        return (
          <span key={i} className="demo-burst absolute text-xl" style={style}>
            {emojis[i % emojis.length]}
          </span>
        );
      })}
    </div>
  );
}

/** Pill button used for choices inside demos. */
export function Chip({
  active,
  onClick,
  children,
  className = "",
  disabled,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/30"
          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-400/60"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Two big hold-to-move buttons so games work on phones without a keyboard. */
export function TouchPad({ onDir }: { onDir: (dir: -1 | 0 | 1) => void }) {
  const btn = (dir: -1 | 1, label: string, aria: string) => (
    <button
      type="button"
      aria-label={aria}
      onPointerDown={(e) => {
        e.preventDefault();
        onDir(dir);
      }}
      onPointerUp={() => onDir(0)}
      onPointerLeave={() => onDir(0)}
      onPointerCancel={() => onDir(0)}
      className="flex-1 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 active:bg-purple-700 text-white text-sm font-bold select-none touch-none transition-colors"
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-2 mt-2">
      {btn(-1, "◀︎ Left", "Move left")}
      {btn(1, "Right ▶︎", "Move right")}
    </div>
  );
}

/**
 * Canvas with a requestAnimationFrame loop. `step` is called every frame with the
 * latest closure, so it can read refs/state without restarting the loop.
 */
export function useCanvas(
  W: number,
  H: number,
  step: (ctx: CanvasRenderingContext2D, dt: number) => void
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      stepRef.current(ctx, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [W, H]);
  return ref;
}

export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** Maps a pointer event on an element to x/y in a W×H logical space. */
export function toLocal(e: { clientX: number; clientY: number; currentTarget: Element }, W: number, H: number) {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

/** True when the user has asked the OS for less motion. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
