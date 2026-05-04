"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Nudge {
  id: string;
  text: string;
  cta?: { label: string; href: string };
}

const NUDGES: Nudge[] = [
  {
    id: "welcome",
    text: "Hey! Want to see what kids actually build here?",
    cta: { label: "See student projects →", href: "#showcase" },
  },
  {
    id: "pricing",
    text: "Most parents start with the free class — no card needed.",
    cta: { label: "Book free trial", href: "/trial" },
  },
  {
    id: "exit",
    text: "One free class. That's the whole commitment.",
    cta: { label: "Claim your free class →", href: "/trial" },
  },
];

export default function LumiNudge() {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("lumi-slide-up");
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const pricingObserverRef = useRef<IntersectionObserver | null>(null);
  const pricingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownRef = useRef<Set<string>>(new Set());

  const showNudge = (index: number) => {
    const nudge = NUDGES[index];
    if (!nudge || shownRef.current.has(nudge.id) || dismissed) return;
    shownRef.current.add(nudge.id);
    setNudgeIndex(index);
    setAnimClass("lumi-slide-up");
    setVisible(true);
  };

  const dismiss = () => {
    setAnimClass("lumi-slide-down");
    setTimeout(() => setVisible(false), 320);
    setDismissed(true);
    sessionStorage.setItem("lumi-dismissed", "1");
  };

  useEffect(() => {
    if (sessionStorage.getItem("lumi-dismissed")) {
      setDismissed(true);
      return;
    }

    // Trigger 1: 8 seconds after page load
    const welcomeTimer = setTimeout(() => showNudge(0), 8000);

    // Trigger 2: user hovers on pricing section for 4+ seconds
    const pricingEl = document.getElementById("pricing");
    if (pricingEl) {
      pricingObserverRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            pricingTimerRef.current = setTimeout(() => showNudge(1), 4000);
          } else {
            if (pricingTimerRef.current) clearTimeout(pricingTimerRef.current);
          }
        },
        { threshold: 0.4 }
      );
      pricingObserverRef.current.observe(pricingEl);
    }

    // Trigger 3: exit intent (mouse leaves viewport from top)
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) showNudge(2);
    };
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      clearTimeout(welcomeTimer);
      if (pricingTimerRef.current) clearTimeout(pricingTimerRef.current);
      pricingObserverRef.current?.disconnect();
      document.removeEventListener("mouseleave", onMouseLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed]);

  if (!visible) return null;

  const nudge = NUDGES[nudgeIndex];

  return (
    <div
      className={`fixed bottom-6 right-5 z-[90] flex items-end gap-3 ${animClass}`}
      style={{ maxWidth: "min(340px, calc(100vw - 24px))" }}
    >
      {/* Lumi avatar */}
      <div className="lumi-float flex-shrink-0 mb-1">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-2 ring-white">
          <span className="text-xl select-none">🌟</span>
        </div>
      </div>

      {/* Bubble */}
      <div className="relative bg-white rounded-2xl rounded-bl-sm border border-[#E2E8F0] shadow-xl shadow-slate-200/80 p-4 flex-1">
        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-[#94A3B8] hover:text-[#64748B] hover:bg-slate-100 flex items-center justify-center transition-all text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>

        <p className="text-[#0F172A] text-sm font-medium leading-snug pr-5 mb-3">
          {nudge.text}
        </p>

        {nudge.cta && (
          <Link
            href={nudge.cta.href}
            onClick={dismiss}
            className="inline-flex items-center text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors"
          >
            {nudge.cta.label}
          </Link>
        )}

        {/* Tail */}
        <div className="absolute -bottom-2 left-0 w-4 h-2 overflow-hidden">
          <div className="w-4 h-4 bg-white border-l border-b border-[#E2E8F0] rotate-45 translate-y-[-8px] -translate-x-[0px]" />
        </div>
      </div>
    </div>
  );
}
