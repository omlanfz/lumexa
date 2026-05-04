"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Demo {
  id: string;
  label: string;
  emoji: string;
  description: string;
  lines: string[];
  OutputComponent: () => React.ReactNode;
}

function StarOutput() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1 py-4">
      {[5, 7, 9, 7, 5].map((count, row) => (
        <div key={row} className="flex gap-1">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="text-amber-400 text-lg leading-none">★</span>
          ))}
        </div>
      ))}
      <p className="text-[#64748B] text-xs mt-3">Your star pattern! 🎉</p>
    </div>
  );
}

function QuizOutput() {
  const [answer, setAnswer] = useState<string | null>(null);
  const correct = "Paris";
  return (
    <div className="flex flex-col gap-3 py-4 px-2">
      <p className="text-[#0F172A] font-semibold text-sm text-center">
        What is the capital of France?
      </p>
      <div className="grid grid-cols-2 gap-2">
        {["Berlin", "Paris", "London", "Rome"].map((opt) => (
          <button
            key={opt}
            onClick={() => setAnswer(opt)}
            className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${
              answer === null
                ? "bg-white border-[#E2E8F0] text-[#334155] hover:border-blue-300 hover:bg-blue-50"
                : opt === correct
                ? "bg-green-50 border-green-400 text-green-700"
                : opt === answer
                ? "bg-red-50 border-red-300 text-red-600"
                : "bg-white border-[#E2E8F0] text-[#94A3B8]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {answer && (
        <p className="text-center text-sm font-semibold output-appear">
          {answer === correct ? "✅ Correct! Great job!" : "❌ Try again!"}
        </p>
      )}
    </div>
  );
}

function ColorOutput() {
  const colors = [
    { label: "Ocean", bg: "#0EA5E9", text: "white" },
    { label: "Forest", bg: "#10B981", text: "white" },
    { label: "Sunset", bg: "#F59E0B", text: "white" },
    { label: "Galaxy", bg: "#7C3AED", text: "white" },
    { label: "Cherry", bg: "#EF4444", text: "white" },
  ];
  const [picked, setPicked] = useState(colors[3]);
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div
        className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg transition-all duration-300 output-appear"
        style={{ background: picked.bg }}
        key={picked.label}
      >
        {picked.label}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {colors.map((c) => (
          <button
            key={c.label}
            onClick={() => setPicked(c)}
            className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
            style={{
              background: c.bg,
              borderColor: picked.label === c.label ? "#0F172A" : "transparent",
            }}
            aria-label={c.label}
          />
        ))}
      </div>
      <p className="text-[#64748B] text-xs">Click a colour!</p>
    </div>
  );
}

const DEMOS: Demo[] = [
  {
    id: "star",
    label: "A star pattern",
    emoji: "⭐",
    description: "A star shape printed with loops",
    lines: [
      "# Build a star pattern",
      "rows = [5, 7, 9, 7, 5]",
      "for count in rows:",
      "    print('★ ' * count)",
    ],
    OutputComponent: StarOutput,
  },
  {
    id: "quiz",
    label: "A quiz game",
    emoji: "🧩",
    description: "An interactive quiz with scoring",
    lines: [
      "// Build a quiz game",
      "const question = {",
      "  q: 'Capital of France?',",
      "  options: ['Berlin','Paris',",
      "            'London','Rome'],",
      "  answer: 'Paris'",
      "};",
    ],
    OutputComponent: QuizOutput,
  },
  {
    id: "color",
    label: "A colour picker",
    emoji: "🎨",
    description: "An interactive colour switcher",
    lines: [
      "// Build a colour app",
      "const colors = [",
      "  'Ocean','Forest',",
      "  'Sunset','Galaxy',",
      "  'Cherry'",
      "];",
      "// Click to change!",
    ],
    OutputComponent: ColorOutput,
  },
];

const TYPING_SPEED = 28; // ms per character

export default function InteractiveCodeDemo() {
  const [chosen, setChosen] = useState<Demo | null>(null);
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const runDemo = (demo: Demo) => {
    clearTimers();
    setChosen(demo);
    setTypedLines([]);
    setShowOutput(false);
    setTyping(true);

    let lineIdx = 0;
    let charIdx = 0;
    let current = "";

    const tick = () => {
      if (lineIdx >= demo.lines.length) {
        setTyping(false);
        timerRef.current = setTimeout(() => setShowOutput(true), 300);
        return;
      }

      const line = demo.lines[lineIdx];

      if (charIdx <= line.length) {
        current = line.slice(0, charIdx);
        setTypedLines((prev) => {
          const next = [...prev];
          next[lineIdx] = current;
          return next;
        });
        charIdx++;
        timerRef.current = setTimeout(tick, TYPING_SPEED);
      } else {
        lineIdx++;
        charIdx = 0;
        current = "";
        setTypedLines((prev) => [...prev, ""]);
        timerRef.current = setTimeout(tick, TYPING_SPEED + 40);
      }
    };

    timerRef.current = setTimeout(tick, 100);
  };

  useEffect(() => () => clearTimers(), []);

  const Output = chosen?.OutputComponent;

  return (
    <section className="py-20 bg-[#EEF3FF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-2">
            Try It Right Now
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-3">
            Build Something Real in 30 Seconds
          </h2>
          <p className="text-[#334155] max-w-xl mx-auto">
            Pick what you want to build. Watch the code write itself. Then hit{" "}
            <span className="font-bold text-[#0F172A]">Run It</span> — and see it work.
          </p>
        </div>

        {/* Choice buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          {DEMOS.map((demo) => (
            <button
              key={demo.id}
              onClick={() => runDemo(demo)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all duration-200 ${
                chosen?.id === demo.id
                  ? "bg-[#2563EB] border-[#2563EB] text-white shadow-lg shadow-blue-200"
                  : "bg-white border-[#E2E8F0] text-[#334155] hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <span className="text-xl">{demo.emoji}</span>
              <div className="text-left">
                <div>{demo.label}</div>
                <div className={`text-[11px] font-normal ${chosen?.id === demo.id ? "text-blue-100" : "text-[#94A3B8]"}`}>
                  {demo.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Editor + Output */}
        {chosen && (
          <div
            key={chosen.id}
            className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-xl shadow-slate-100 section-fade-up"
          >
            {/* Code panel */}
            <div className="bg-[#0F172A] p-5">
              {/* Titlebar */}
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-slate-500 text-xs font-mono">
                  {chosen.id === "star" ? "star.py" : chosen.id === "quiz" ? "quiz.js" : "colors.js"}
                </span>
              </div>

              {/* Code lines */}
              <div className="font-mono text-sm space-y-0.5 min-h-[160px]">
                {typedLines.map((line, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-slate-600 select-none w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-green-300">
                      {line}
                      {i === typedLines.length - 1 && typing && (
                        <span className="code-cursor text-white">▎</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Run button */}
              {!typing && typedLines.length > 0 && !showOutput && (
                <button
                  onClick={() => setShowOutput(true)}
                  className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 output-appear"
                >
                  ▶ Run It
                </button>
              )}
              {showOutput && (
                <div className="mt-4 flex items-center gap-2 text-green-400 text-xs font-mono output-appear">
                  <span className="animate-pulse">●</span> Running...
                </div>
              )}
            </div>

            {/* Output panel */}
            <div className="bg-white border-l border-[#E2E8F0] p-5 min-h-[220px] flex flex-col">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                Output
              </p>
              {showOutput && Output ? (
                <div className="flex-1 output-appear">
                  <Output />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#CBD5E1] text-sm">
                  {typing ? "Writing code…" : "Hit ▶ Run It to see the magic"}
                </div>
              )}
            </div>
          </div>
        )}

        {!chosen && (
          <div className="text-center text-[#94A3B8] text-sm py-8">
            ↑ Pick something to build above
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-[#64748B] text-sm mb-4">
            Want to learn how you just did that?
          </p>
          <Link
            href="/trial"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-200 transition-all hover:scale-[1.02] active:scale-95"
          >
            First class is free — no card needed →
          </Link>
        </div>
      </div>
    </section>
  );
}
