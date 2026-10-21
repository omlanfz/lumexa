"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { StudentProject } from "@/lib/studentProjects";
import { DEMOS } from "./registry";
import CodePane from "./CodePane";
import { prefersReducedMotion } from "./ui";

interface Props {
  project: StudentProject;
  onClose: () => void;
}

const CLOSE_MS = 200;

/**
 * "Try it" popup for a showcase project: the code types itself on the left, then a
 * small working version of the project appears on the right. Closes with the ✕,
 * the Escape key, or a click anywhere outside the panel.
 */
export default function ProjectDemoModal({ project, onClose }: Props) {
  const spec = DEMOS[project.id];
  const full = useMemo(() => spec.code.join("\n"), [spec]);
  // Where each line begins inside `full`, so block-style code can appear one line at a time.
  const starts = useMemo(
    () => spec.code.map((_, i) => spec.code.slice(0, i).reduce((at, l) => at + l.length + 1, 0)),
    [spec]
  );

  const [shown, setShown] = useState(() => (prefersReducedMotion() ? full.length : 0));
  const [closing, setClosing] = useState(false);
  const [flashLine, setFlashLine] = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typing = shown < full.length;

  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  const flash = useCallback((line: number) => {
    setFlashLine(line);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashLine(null), 1100);
  }, []);

  // The code writes itself in about a second; clicking the code skips ahead.
  useEffect(() => {
    if (!typing) return;
    const step = Math.max(2, Math.ceil(full.length / 40));
    const id = setInterval(() => setShown((s) => Math.min(full.length, s + step)), 24);
    return () => clearInterval(id);
  }, [typing, full.length]);

  // Lock page scroll (without the layout jumping when the scrollbar disappears).
  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const bar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (bar > 0) body.style.paddingRight = `${bar}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, []);

  // Keyboard: Escape closes, Tab stays inside the dialog. Focus goes back to the trigger afterwards.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [requestClose]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const lines =
    spec.lang === "blocks" ? spec.code.filter((_, i) => starts[i] <= shown) : full.slice(0, shown).split("\n");
  const Output = spec.Output;
  const pct = Math.round((shown / full.length) * 100);

  return (
    <div className="fixed inset-0 z-[950] flex items-end sm:items-center justify-center sm:p-6">
      <div
        className={`absolute inset-0 bg-[#030712]/80 backdrop-blur-sm ${closing ? "demo-backdrop-out" : "demo-backdrop-in"}`}
        onClick={requestClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-title"
        className={`relative z-10 w-full sm:max-w-5xl max-h-[94dvh] sm:max-h-[88vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200 dark:border-white/10 shadow-2xl shadow-purple-950/40 ${
          closing ? "demo-sheet-out" : "demo-sheet-in"
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-white/10">
          <div className="w-11 h-11 flex-none rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-500/20 dark:to-blue-500/20 grid place-items-center text-2xl">
            {project.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-300">
              Build Something Real in 30 Seconds
            </p>
            <h2 id="demo-title" className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white leading-tight truncate">
              {project.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              by {project.student}, age {project.age} · {project.tech.join(" · ")}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            aria-label="Close preview"
            className="flex-none w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 dark:text-slate-200 text-lg font-bold grid place-items-center transition-colors active:scale-90"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid md:grid-cols-2 md:min-h-[420px]">
            <div className="order-2 md:order-1 md:border-r border-t md:border-t-0 border-slate-200 dark:border-white/10">
              <CodePane
                file={spec.file}
                lang={spec.lang}
                lines={lines}
                flashLine={flashLine}
                typing={typing}
                onSkip={() => setShown(full.length)}
              />
            </div>
            <div className="order-1 md:order-2 p-4 sm:p-5 bg-slate-50 dark:bg-[#0F1A30]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Output</p>
                {!typing && (
                  <button
                    type="button"
                    onClick={() => setShown(0)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-300 hover:underline underline-offset-2"
                  >
                    ↻ Replay
                  </button>
                )}
              </div>
              {typing ? (
                <div className="min-h-[280px] grid place-items-center text-center">
                  <div className="w-full max-w-[220px]">
                    <div className="text-5xl demo-float">{project.emoji}</div>
                    <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">Writing the code…</p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-[width] duration-100" style={{ width: `${pct}%` }} />
                    </div>
                    <button type="button" onClick={() => setShown(full.length)} className="mt-3 text-[11px] font-semibold text-slate-400 hover:text-purple-600 underline underline-offset-2">
                      Skip to the result
                    </button>
                  </div>
                </div>
              ) : (
                <div className="output-appear">
                  <Output flash={flash} />
                  <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">💡 {spec.hint}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1224]">
          <p className="flex-1 text-xs text-slate-600 dark:text-slate-300">
            🎯 <span className="font-bold">Skill demonstrated:</span> {project.skill}
          </p>
          <Link
            href="/trial"
            className="text-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-black shadow-md shadow-purple-500/30 transition-all active:scale-95"
          >
            Build this in a free lesson →
          </Link>
        </div>
      </div>
    </div>
  );
}
