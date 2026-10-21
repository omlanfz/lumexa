"use client";

import { useState } from "react";
import type { Interest } from "@/lib/studentProjects";

export type { Interest } from "@/lib/studentProjects";

interface Option {
  id: Interest;
  emoji: string;
  label: string;
  sub: string;
  callout: string;
  ring: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  hover: string;
}

const OPTIONS: Option[] = [
  {
    id: "games",
    emoji: "🎮",
    label: "Games",
    sub: "Roblox, Python, Unity",
    callout: "Your child can build real games with their own rules, levels and scoring that friends can play.",
    ring: "ring-red-300 dark:ring-red-500/60",
    activeBg: "bg-red-50 dark:bg-red-900/20",
    activeBorder: "border-red-300 dark:border-red-500/60",
    activeText: "text-red-700 dark:text-red-300",
    hover: "hover:border-red-200 hover:bg-red-50/70 dark:hover:border-red-700/50 dark:hover:bg-red-900/10",
  },
  {
    id: "ai",
    emoji: "🤖",
    label: "AI & Robots",
    sub: "Python, ML, chatbots",
    callout: "Your child can build AI apps with machine learning: chatbots, image classifiers and smart helpers.",
    ring: "ring-purple-300 dark:ring-purple-500/60",
    activeBg: "bg-purple-50 dark:bg-purple-900/20",
    activeBorder: "border-purple-300 dark:border-purple-500/60",
    activeText: "text-purple-700 dark:text-purple-300",
    hover: "hover:border-purple-200 hover:bg-purple-50/70 dark:hover:border-purple-700/50 dark:hover:bg-purple-900/10",
  },
  {
    id: "web",
    emoji: "🌐",
    label: "Websites",
    sub: "HTML, React, Next.js",
    callout: "Your child can build and publish real websites: portfolios, shops and apps other people can use.",
    ring: "ring-blue-300 dark:ring-blue-500/60",
    activeBg: "bg-blue-50 dark:bg-blue-900/20",
    activeBorder: "border-blue-300 dark:border-blue-500/60",
    activeText: "text-blue-700 dark:text-blue-300",
    hover: "hover:border-blue-200 hover:bg-blue-50/70 dark:hover:border-blue-700/50 dark:hover:bg-blue-900/10",
  },
  {
    id: "data",
    emoji: "📊",
    label: "Data & Science",
    sub: "Python, Pandas, Plotly",
    callout: "Your child can explore real datasets and build interactive charts and dashboards.",
    ring: "ring-teal-300 dark:ring-teal-500/60",
    activeBg: "bg-teal-50 dark:bg-teal-900/20",
    activeBorder: "border-teal-300 dark:border-teal-500/60",
    activeText: "text-teal-700 dark:text-teal-300",
    hover: "hover:border-teal-200 hover:bg-teal-50/70 dark:hover:border-teal-700/50 dark:hover:bg-teal-900/10",
  },
  {
    id: "young",
    emoji: "🌟",
    label: "Young Learners",
    sub: "Scratch, basics, fun",
    callout: "A friendly first step: animated stories, quiz games and drawing robots, created from the very first lesson.",
    ring: "ring-amber-300 dark:ring-amber-500/60",
    activeBg: "bg-amber-50 dark:bg-amber-900/20",
    activeBorder: "border-amber-300 dark:border-amber-500/60",
    activeText: "text-amber-700 dark:text-amber-300",
    hover: "hover:border-amber-200 hover:bg-amber-50/70 dark:hover:border-amber-700/50 dark:hover:bg-amber-900/10",
  },
  {
    id: "career",
    emoji: "💼",
    label: "Future Career",
    sub: "Portfolio, brand, skills",
    callout: "Your child can build a professional portfolio, a personal brand and a simple service plan.",
    ring: "ring-green-300 dark:ring-green-500/60",
    activeBg: "bg-green-50 dark:bg-green-900/20",
    activeBorder: "border-green-300 dark:border-green-500/60",
    activeText: "text-green-700 dark:text-green-300",
    hover: "hover:border-green-200 hover:bg-green-50/70 dark:hover:border-green-700/50 dark:hover:bg-green-900/10",
  },
];

interface Props {
  selected: Interest | null;
  onSelect: (interest: Interest | null) => void;
}

export default function InterestSelector({ selected, onSelect }: Props) {
  const [justSelected, setJustSelected] = useState<Interest | null>(null);

  // Tapping the chosen option again clears it, so nothing is ever forced on the visitor.
  const handleSelect = (id: Interest) => {
    if (selected === id) {
      onSelect(null);
      return;
    }
    onSelect(id);
    setJustSelected(id);
    setTimeout(() => setJustSelected(null), 600);
  };

  const active = OPTIONS.find((o) => o.id === selected) ?? null;

  return (
    <section className="py-16 bg-white dark:bg-[#07101F] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white mb-2">
            What would your child like to build?
          </h2>
          <p className="text-[#64748B] dark:text-gray-400 text-sm">
            Pick an area to see projects built by Lumexa students.
          </p>
        </div>

        <div role="group" aria-label="What would your child like to build?" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {OPTIONS.map((opt) => {
            const isActive = selected === opt.id;
            const isBouncing = justSelected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleSelect(opt.id)}
                className={[
                  "relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center",
                  "transition-all duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-purple-500",
                  "active:scale-95",
                  isActive
                    ? `${opt.activeBg} ${opt.activeBorder} shadow-md ring-2 ring-offset-1 ${opt.ring} dark:ring-offset-[#07101F]`
                    : `bg-[#F8FAFF] dark:bg-gray-900/40 border-[#E2E8F0] dark:border-gray-700/60 ${opt.hover} hover:shadow-sm hover:-translate-y-0.5`,
                ].join(" ")}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                      <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <span className={["text-2xl transition-transform duration-200", isActive ? "scale-110" : "", isBouncing ? "animate-bounce" : ""].join(" ")}>
                  {opt.emoji}
                </span>
                <span className={`text-sm font-black ${isActive ? opt.activeText : "text-[#0F172A] dark:text-white"}`}>{opt.label}</span>
                <span className="text-[10px] text-[#94A3B8] dark:text-gray-500 leading-tight">{opt.sub}</span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="mt-8 min-h-[3.5rem]">
          {active ? (
            <div
              key={active.id}
              className="p-4 rounded-2xl bg-[#EEF3FF] dark:bg-purple-900/20 border border-[#C7D7FD] dark:border-purple-700/40 section-fade-up"
            >
              <p className="text-[#334155] dark:text-gray-300 text-sm text-center">
                <span className="font-bold text-[#0F172A] dark:text-white mr-1">
                  {active.emoji} {active.label}:
                </span>
                {active.callout}
              </p>
              <p className="mt-2 text-center">
                <a
                  href="#showcase"
                  className="text-sm text-purple-600 dark:text-purple-400 font-semibold underline underline-offset-4 decoration-purple-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  See projects in this area built by Lumexa students ↓
                </a>
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-[#94A3B8] dark:text-gray-500">
              Not sure yet? Take a look at the featured projects below.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
