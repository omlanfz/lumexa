"use client";

import { useEffect, useState, useRef } from "react";

const MILESTONES = [
  { id: "hero",     label: "Meet Lumexa",        icon: "🚀", color: "#7C3AED" },
  { id: "showcase", label: "Real student work",   icon: "🎮", color: "#2563EB" },
  { id: "pathways", label: "Choose your path",    icon: "🗺️", color: "#0D9488" },
  { id: "pricing",  label: "Start free today",    icon: "⭐", color: "#7C3AED" },
];

export default function ScrollMilestones() {
  const [active, setActive]   = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [fillPct, setFillPct] = useState(0);

  useEffect(() => {
    const ids = MILESTONES.map((m) => m.id);

    const observers = ids.map((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(idx);
        },
        { threshold: 0.2, rootMargin: "-10% 0px -55% 0px" }
      );
      obs.observe(el);
      return obs;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  useEffect(() => {
    setFillPct((active / (MILESTONES.length - 1)) * 100);
  }, [active]);

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center">
      {/* Outer track */}
      <div
        ref={trackRef}
        className="relative flex flex-col items-center"
        style={{ gap: "28px" }}
      >
        {/* Filled progress bar (absolute, behind dots) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-3 w-0.5 rounded-full bg-[#E2E8F0]"
          style={{ height: `calc(100% - 24px)` }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 top-3 w-0.5 rounded-full transition-all duration-700 ease-in-out"
          style={{
            height: `calc((100% - 24px) * ${fillPct / 100})`,
            background: "linear-gradient(to bottom, #7C3AED, #2563EB)",
          }}
        />

        {MILESTONES.map((m, idx) => {
          const isActive  = idx === active;
          const isPast    = idx < active;
          const isHov     = hovered === idx;
          const showLabel = isActive || isHov;

          return (
            <div key={m.id} className="relative z-10 flex items-center">
              <button
                onClick={() => {
                  document.getElementById(m.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                aria-label={m.label}
                className="relative flex items-center justify-center focus:outline-none"
                style={{
                  width:  isActive ? "28px" : "18px",
                  height: isActive ? "28px" : "18px",
                  borderRadius: "50%",
                  background: isActive
                    ? m.color
                    : isPast
                    ? "#A78BFA"
                    : "#F1F5F9",
                  border: isActive
                    ? `2px solid ${m.color}`
                    : isPast
                    ? "2px solid #C4B5FD"
                    : "2px solid #CBD5E1",
                  boxShadow: isActive
                    ? `0 0 0 4px ${m.color}22, 0 2px 8px ${m.color}40`
                    : isHov
                    ? "0 0 0 3px rgba(124,58,237,0.15)"
                    : "none",
                  transition: "all 0.25s ease",
                }}
              >
                {isActive && (
                  <span
                    className="text-[11px] leading-none select-none"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                  >
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
                className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap transition-all duration-200"
                style={{
                  opacity: showLabel ? 1 : 0,
                  transform: showLabel ? "translateY(-50%) translateX(0)" : "translateY(-50%) translateX(-4px)",
                }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-semibold shadow-lg"
                  style={{
                    background: isActive ? m.color : "#0F172A",
                    boxShadow: isActive ? `0 4px 12px ${m.color}40` : "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <span className="text-xs">{m.icon}</span>
                  {m.label}
                </div>
                {/* Arrow */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0 h-0"
                  style={{
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderRight: `5px solid ${isActive ? m.color : "#0F172A"}`,
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
