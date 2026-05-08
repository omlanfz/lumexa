"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "../ThemeProvider";

const MILESTONES = [
  { id: "hero",     label: "Meet Lumexa",      icon: "🚀", color: "#7C3AED", glow: "rgba(124,58,237,0.4)" },
  { id: "showcase", label: "Real student work", icon: "🎮", color: "#2563EB", glow: "rgba(37,99,235,0.4)"  },
  { id: "pathways", label: "Choose your path",  icon: "🗺️", color: "#0D9488", glow: "rgba(13,148,136,0.4)" },
  { id: "pricing",  label: "Start free today",  icon: "⭐", color: "#7C3AED", glow: "rgba(124,58,237,0.4)" },
];

// Fixed dot size — prevents track height jumps that break the progress bar
const DOT_SIZE = 20;
const DOT_GAP  = 32;

export default function ScrollMilestones() {
  const [active, setActive]   = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [fillPct, setFillPct] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    const observers = MILESTONES.map((m, idx) => {
      const el = document.getElementById(m.id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(idx);
        },
        { threshold: 0.15, rootMargin: "-5% 0px -50% 0px" }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  useEffect(() => {
    setFillPct((active / (MILESTONES.length - 1)) * 100);
  }, [active]);

  // Track height = (n-1) * (dotSize + gap) — constant since dot sizes are fixed
  const trackH = (MILESTONES.length - 1) * (DOT_SIZE + DOT_GAP);

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center">
      <div className="relative flex flex-col items-center" style={{ gap: `${DOT_GAP}px` }}>

        {/* Background track */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0.5 rounded-full"
          style={{
            top: DOT_SIZE / 2,
            height: trackH,
            background: isDark ? "rgba(100,116,139,0.35)" : "#E2E8F0",
          }}
        />

        {/* Filled progress */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0.5 rounded-full"
          style={{
            top: DOT_SIZE / 2,
            height: trackH * (fillPct / 100),
            background: "linear-gradient(to bottom, #7C3AED, #2563EB)",
            transition: "height 0.6s cubic-bezier(0.4,0,0.2,1)",
          }}
        />

        {MILESTONES.map((m, idx) => {
          const isActive  = idx === active;
          const isPast    = idx < active;
          const isHov     = hovered === idx;
          const showLabel = isActive || isHov;

          return (
            <div key={m.id} className="relative z-10 flex items-center" style={{ height: DOT_SIZE }}>
              <button
                onClick={() => {
                  document.getElementById(m.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                aria-label={m.label}
                className="relative flex items-center justify-center focus:outline-none"
                style={{
                  width:  DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: "50%",
                  background: isActive
                    ? m.color
                    : isPast
                    ? "#A78BFA"
                    : isDark ? "rgba(100,116,139,0.25)" : "#F1F5F9",
                  border: isActive
                    ? `2px solid ${m.color}`
                    : isPast
                    ? "2px solid #C4B5FD"
                    : isDark ? "2px solid rgba(100,116,139,0.5)" : "2px solid #CBD5E1",
                  boxShadow: isActive
                    ? `0 0 0 4px ${m.glow}, 0 2px 8px ${m.glow}`
                    : isHov
                    ? "0 0 0 3px rgba(124,58,237,0.15)"
                    : "none",
                  transition: "background 0.25s ease, border 0.25s ease, box-shadow 0.25s ease",
                }}
              >
                {isActive && (
                  <span className="text-[9px] leading-none select-none" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
                    {m.icon}
                  </span>
                )}
                {!isActive && isPast && (
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Floating label */}
              <div
                className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap"
                style={{
                  opacity: showLabel ? 1 : 0,
                  transform: showLabel ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(-6px)",
                  transition: "opacity 0.2s ease, transform 0.2s ease",
                }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-semibold shadow-lg"
                  style={{
                    background: isActive ? m.color : isDark ? "#0F172A" : "#334155",
                    boxShadow: isActive ? `0 4px 12px ${m.glow}` : "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <span className="text-xs">{m.icon}</span>
                  {m.label}
                </div>
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0 h-0"
                  style={{
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderRight: `5px solid ${isActive ? m.color : isDark ? "#0F172A" : "#334155"}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
