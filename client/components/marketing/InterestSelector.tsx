"use client";

import { useEffect, useRef } from "react";

export type Interest = "games" | "ai" | "web" | "data" | "young" | "career";

interface Option {
  id: Interest;
  emoji: string;
  label: string;
  sub: string;
  ages: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const OPTIONS: Option[] = [
  {
    id: "games",
    emoji: "🎮",
    label: "Games",
    sub: "Roblox, Python, Unity",
    ages: "Ages 10–18",
    color: "hover:border-red-200 hover:bg-red-50",
    activeBg: "bg-red-50",
    activeBorder: "border-red-300",
    activeText: "text-red-700",
  },
  {
    id: "ai",
    emoji: "🤖",
    label: "AI & Robots",
    sub: "Python, ML, ChatGPT API",
    ages: "Ages 12–18",
    color: "hover:border-purple-200 hover:bg-purple-50",
    activeBg: "bg-purple-50",
    activeBorder: "border-purple-300",
    activeText: "text-purple-700",
  },
  {
    id: "web",
    emoji: "🌐",
    label: "Websites",
    sub: "HTML, React, Next.js",
    ages: "Ages 12–18",
    color: "hover:border-blue-200 hover:bg-blue-50",
    activeBg: "bg-blue-50",
    activeBorder: "border-blue-300",
    activeText: "text-blue-700",
  },
  {
    id: "data",
    emoji: "📊",
    label: "Data & Science",
    sub: "Python, Pandas, Plotly",
    ages: "Ages 13–18",
    color: "hover:border-teal-200 hover:bg-teal-50",
    activeBg: "bg-teal-50",
    activeBorder: "border-teal-300",
    activeText: "text-teal-700",
  },
  {
    id: "young",
    emoji: "🌟",
    label: "Young Learners",
    sub: "Scratch, basics, fun",
    ages: "Ages 6–11",
    color: "hover:border-amber-200 hover:bg-amber-50",
    activeBg: "bg-amber-50",
    activeBorder: "border-amber-300",
    activeText: "text-amber-700",
  },
  {
    id: "career",
    emoji: "💼",
    label: "Future Career",
    sub: "Freelancing, portfolio",
    ages: "Ages 15–18",
    color: "hover:border-green-200 hover:bg-green-50",
    activeBg: "bg-green-50",
    activeBorder: "border-green-300",
    activeText: "text-green-700",
  },
];

interface Props {
  selected: Interest;
  onSelect: (interest: Interest) => void;
}

export default function InterestSelector({ selected, onSelect }: Props) {
  const prevRef = useRef<Interest>(selected);

  useEffect(() => {
    prevRef.current = selected;
  }, [selected]);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-purple-600 text-sm font-bold uppercase tracking-widest mb-2">
            Personalise Your Tour
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] mb-2">
            What does your child love?
          </h2>
          <p className="text-[#64748B] text-sm">
            Pick an interest and we&apos;ll show you exactly what they&apos;ll build.
          </p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {OPTIONS.map((opt) => {
            const isActive = selected === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                }}
                className={`
                  relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center
                  transition-all duration-200 cursor-pointer select-none focus:outline-none
                  ${isActive
                    ? `${opt.activeBg} ${opt.activeBorder} shadow-sm`
                    : `bg-[#F8FAFF] border-[#E2E8F0] ${opt.color}`
                  }
                `}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500" />
                )}
                <span className="text-2xl">{opt.emoji}</span>
                <span
                  className={`text-sm font-black ${
                    isActive ? opt.activeText : "text-[#0F172A]"
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-[#94A3B8] leading-tight">
                  {opt.sub}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? opt.activeText : "text-[#64748B]"
                  }`}
                >
                  {opt.ages}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic callout */}
        <div
          key={selected}
          className="mt-8 p-4 rounded-2xl bg-[#EEF3FF] border border-[#C7D7FD] section-fade-up text-center"
        >
          <p className="text-[#334155] text-sm">
            <span className="font-bold text-[#0F172A]">
              {OPTIONS.find((o) => o.id === selected)?.emoji}{" "}
              {OPTIONS.find((o) => o.id === selected)?.label}
            </span>{" "}
            — here are 2 real projects built by Lumexa students in this path.
            Scroll down to explore them.
          </p>
        </div>
      </div>
    </section>
  );
}
