"use client";

import { useEffect, useRef, useState } from "react";

export type Interest = "games" | "ai" | "web" | "data" | "young" | "career";

interface Option {
  id: Interest;
  emoji: string;
  label: string;
  sub: string;
  ages: string;
  callout: string;
  ring: string;
  activeBg: string;
  activeBg_dark: string;
  activeBorder: string;
  activeText: string;
  hoverLight: string;
  hoverDark: string;
}

const OPTIONS: Option[] = [
  {
    id: "games",
    emoji: "🎮",
    label: "Games",
    sub: "Roblox, Python, Unity",
    ages: "Ages 10-18",
    callout: "Your child will build real multiplayer games with custom mechanics, deployed live for friends to play.",
    ring: "ring-red-300 dark:ring-red-500/60",
    activeBg: "bg-red-50",
    activeBg_dark: "dark:bg-red-900/20",
    activeBorder: "border-red-300 dark:border-red-500/60",
    activeText: "text-red-700 dark:text-red-300",
    hoverLight: "hover:border-red-200 hover:bg-red-50/70",
    hoverDark: "dark:hover:border-red-700/50 dark:hover:bg-red-900/10",
  },
  {
    id: "ai",
    emoji: "🤖",
    label: "AI & Robots",
    sub: "Python, ML, ChatGPT API",
    ages: "Ages 12-18",
    callout: "Your child will build AI apps with real machine learning — chatbots, image classifiers, and recommendation engines.",
    ring: "ring-purple-300 dark:ring-purple-500/60",
    activeBg: "bg-purple-50",
    activeBg_dark: "dark:bg-purple-900/20",
    activeBorder: "border-purple-300 dark:border-purple-500/60",
    activeText: "text-purple-700 dark:text-purple-300",
    hoverLight: "hover:border-purple-200 hover:bg-purple-50/70",
    hoverDark: "dark:hover:border-purple-700/50 dark:hover:bg-purple-900/10",
  },
  {
    id: "web",
    emoji: "🌐",
    label: "Websites",
    sub: "HTML, React, Next.js",
    ages: "Ages 12-18",
    callout: "Your child will ship real websites live on the internet — portfolios, stores, and apps other people can actually use.",
    ring: "ring-blue-300 dark:ring-blue-500/60",
    activeBg: "bg-blue-50",
    activeBg_dark: "dark:bg-blue-900/20",
    activeBorder: "border-blue-300 dark:border-blue-500/60",
    activeText: "text-blue-700 dark:text-blue-300",
    hoverLight: "hover:border-blue-200 hover:bg-blue-50/70",
    hoverDark: "dark:hover:border-blue-700/50 dark:hover:bg-blue-900/10",
  },
  {
    id: "data",
    emoji: "📊",
    label: "Data & Science",
    sub: "Python, Pandas, Plotly",
    ages: "Ages 13-18",
    callout: "Your child will analyse real datasets and build interactive dashboards — the exact skills data scientists use daily.",
    ring: "ring-teal-300 dark:ring-teal-500/60",
    activeBg: "bg-teal-50",
    activeBg_dark: "dark:bg-teal-900/20",
    activeBorder: "border-teal-300 dark:border-teal-500/60",
    activeText: "text-teal-700 dark:text-teal-300",
    hoverLight: "hover:border-teal-200 hover:bg-teal-50/70",
    hoverDark: "dark:hover:border-teal-700/50 dark:hover:bg-teal-900/10",
  },
  {
    id: "young",
    emoji: "🌟",
    label: "Young Learners",
    sub: "Scratch, basics, fun",
    ages: "Ages 6-11",
    callout: "Perfect first step: animated stories, quiz games, and drawing robots — your child creates something in the very first session.",
    ring: "ring-amber-300 dark:ring-amber-500/60",
    activeBg: "bg-amber-50",
    activeBg_dark: "dark:bg-amber-900/20",
    activeBorder: "border-amber-300 dark:border-amber-500/60",
    activeText: "text-amber-700 dark:text-amber-300",
    hoverLight: "hover:border-amber-200 hover:bg-amber-50/70",
    hoverDark: "dark:hover:border-amber-700/50 dark:hover:bg-amber-900/10",
  },
  {
    id: "career",
    emoji: "💼",
    label: "Future Career",
    sub: "Freelancing, portfolio",
    ages: "Ages 15-18",
    callout: "Your child builds a freelance brand, earns real income, and graduates with clients — not just a certificate.",
    ring: "ring-green-300 dark:ring-green-500/60",
    activeBg: "bg-green-50",
    activeBg_dark: "dark:bg-green-900/20",
    activeBorder: "border-green-300 dark:border-green-500/60",
    activeText: "text-green-700 dark:text-green-300",
    hoverLight: "hover:border-green-200 hover:bg-green-50/70",
    hoverDark: "dark:hover:border-green-700/50 dark:hover:bg-green-900/10",
  },
];

interface Props {
  selected: Interest;
  onSelect: (interest: Interest) => void;
}

export default function InterestSelector({ selected, onSelect }: Props) {
  const prevRef = useRef<Interest>(selected);
  const [justSelected, setJustSelected] = useState<Interest | null>(null);

  useEffect(() => {
    prevRef.current = selected;
  }, [selected]);

  const handleSelect = (id: Interest) => {
    onSelect(id);
    setJustSelected(id);
    setTimeout(() => setJustSelected(null), 600);
  };

  const active = OPTIONS.find((o) => o.id === selected)!;

  return (
    <section className="py-16 bg-white dark:bg-[#07101F] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white mb-2">
            What does your child love?
          </h2>
          <p className="text-[#64748B] dark:text-gray-400 text-sm">
            Pick a path and see real projects built by Lumexa students just like yours.
          </p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {OPTIONS.map((opt) => {
            const isActive = selected === opt.id;
            const isBouncing = justSelected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={[
                  "relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center",
                  "transition-all duration-200 cursor-pointer select-none focus:outline-none",
                  "active:scale-95",
                  isActive
                    ? `${opt.activeBg} ${opt.activeBg_dark} ${opt.activeBorder} shadow-md ring-2 ring-offset-1 ${opt.ring} dark:ring-offset-[#07101F]`
                    : `bg-[#F8FAFF] dark:bg-gray-900/40 border-[#E2E8F0] dark:border-gray-700/60 ${opt.hoverLight} ${opt.hoverDark} hover:shadow-sm hover:-translate-y-0.5`,
                ].join(" ")}
              >
                {/* Selected indicator */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <span
                  className={[
                    "text-2xl transition-transform duration-200",
                    isActive ? "scale-110" : "group-hover:scale-105",
                    isBouncing ? "animate-bounce" : "",
                  ].join(" ")}
                >
                  {opt.emoji}
                </span>
                <span
                  className={`text-sm font-black ${
                    isActive ? opt.activeText : "text-[#0F172A] dark:text-white"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-[#94A3B8] dark:text-gray-500 leading-tight">
                  {opt.sub}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? opt.activeText : "text-[#64748B] dark:text-gray-400"
                  }`}
                >
                  {opt.ages}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic callout — changes per selection */}
        <div
          key={selected}
          className="mt-8 p-4 rounded-2xl bg-[#EEF3FF] dark:bg-purple-900/20 border border-[#C7D7FD] dark:border-purple-700/40 section-fade-up"
        >
          <p className="text-[#334155] dark:text-gray-300 text-sm text-center">
            <span className="font-bold text-[#0F172A] dark:text-white mr-1">
              {active.emoji} {active.label}:
            </span>
            {active.callout}
            <span className="ml-2 text-purple-600 dark:text-purple-400 font-semibold">
              Scroll down to see student projects ↓
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
