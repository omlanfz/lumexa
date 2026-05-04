"use client";

import { useEffect, useState } from "react";

const MILESTONES = [
  { id: "hero",     label: "Meet Lumexa",         icon: "🚀" },
  { id: "showcase", label: "See what kids build",  icon: "🎮" },
  { id: "pathways", label: "Find your path",       icon: "🗺️" },
  { id: "pricing",  label: "Start free today",     icon: "⭐" },
];

export default function ScrollMilestones() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0); // 0–3 filled
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const ids = MILESTONES.map((m) => m.id);

    const observers = ids.map((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive(idx);
            setProgress(idx);
          }
        },
        { threshold: 0.3, rootMargin: "-10% 0px -60% 0px" }
      );
      obs.observe(el);
      return obs;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-1.5">
      {MILESTONES.map((m, idx) => {
        const isActive = idx === active;
        const isPast   = idx < active;
        const isHov    = hovered === idx;

        return (
          <div key={m.id} className="relative flex items-center">
            {/* Connector line above (skip first) */}
            {idx > 0 && (
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-1.5 rounded-full transition-colors duration-500"
                style={{ background: progress >= idx ? "#7C3AED" : "#CBD5E1" }}
              />
            )}

            {/* Dot */}
            <button
              onClick={() => {
                const el = document.getElementById(m.id);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className="relative w-3 h-3 rounded-full transition-all duration-300 focus:outline-none"
              style={{
                background: isActive
                  ? "#7C3AED"
                  : isPast
                  ? "#A78BFA"
                  : "#E2E8F0",
                transform: isActive ? "scale(1.4)" : "scale(1)",
                boxShadow: isActive ? "0 0 0 3px rgba(124,58,237,0.2)" : "none",
              }}
              aria-label={m.label}
            />

            {/* Tooltip */}
            {isHov && (
              <div className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#0F172A] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg pointer-events-none">
                <span className="mr-1">{m.icon}</span>
                {m.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
