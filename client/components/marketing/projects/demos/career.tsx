"use client";

import { useState } from "react";
import type { DemoProps } from "../types";
import { Burst, Chip } from "../ui";

/* ───────────────────────── Freelance Brand Kit (Canva · HTML · CSS) ───────────────────────── */

export const BRAND_CODE = [
  ":root {",
  "  --brand: #7C3AED;",
  '  --font: "Poppins", sans-serif;',
  "}",
  "",
  ".card {",
  "  background: var(--brand);",
  "  font-family: var(--font);",
  "}",
];

const PALETTES = [
  { n: "Violet", c: "#7C3AED", c2: "#DB2777" },
  { n: "Ocean", c: "#0EA5E9", c2: "#2563EB" },
  { n: "Forest", c: "#16A34A", c2: "#0D9488" },
  { n: "Sunset", c: "#F59E0B", c2: "#EF4444" },
  { n: "Ink", c: "#334155", c2: "#0F172A" },
];
const FONTS = [
  { n: "Poppins", css: 'Poppins, "Inter", system-ui, sans-serif', w: 800 },
  { n: "Georgia", css: "Georgia, serif", w: 700 },
  { n: "Mono", css: 'ui-monospace, "JetBrains Mono", monospace', w: 700 },
];
const LOGOS = ["🌲", "☕", "🎨", "🚀", "🧁"];

export function BrandOutput({ flash }: DemoProps) {
  const [name, setName] = useState("Pixel & Pine");
  const [pal, setPal] = useState(0);
  const [font, setFont] = useState(0);
  const [logo, setLogo] = useState(0);
  const [burst, setBurst] = useState(0);

  const p = PALETTES[pal];
  const f = FONTS[font];

  return (
    <div className="relative select-none">
      <div
        className="rounded-2xl p-5 text-white shadow-lg transition-all duration-500"
        style={{ background: `linear-gradient(135deg, ${p.c}, ${p.c2})`, fontFamily: f.css }}
      >
        <div className="flex items-center gap-3">
          <div key={logo} className="w-14 h-14 rounded-2xl bg-white grid place-items-center text-3xl shadow-md demo-pop">{LOGOS[logo]}</div>
          <div className="min-w-0">
            <div className="text-xl leading-tight truncate" style={{ fontWeight: f.w }}>{name || "Your brand"}</div>
            <div className="text-xs opacity-90">Fresh ideas, made simple</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2.5 items-stretch">
          <div className="flex-1 rounded-xl bg-white text-slate-800 p-3 shadow-md -rotate-2 transition-transform hover:rotate-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Business card</div>
            <div className="text-sm truncate" style={{ fontWeight: f.w, color: p.c, fontFamily: f.css }}>{name || "Your brand"}</div>
            <div className="text-[10px] text-slate-500">Designer · hello@yourbrand.com</div>
          </div>
          <button
            type="button"
            onClick={() => { setBurst((b) => b + 1); flash(6); }}
            className="self-center px-4 py-2.5 rounded-xl bg-white text-sm font-black shadow-md active:scale-90 transition-transform"
            style={{ color: p.c, fontFamily: f.css }}
          >
            Book a call
          </button>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] px-3 py-2 leading-5">
        <span className="text-sky-300">--brand</span>: <span style={{ color: p.c === "#334155" ? "#CBD5E1" : p.c }}>{p.c}</span>;{" "}
        <span className="text-sky-300">--font</span>: <span className="text-emerald-300">&quot;{f.n}&quot;</span>;
      </div>

      <label className="mt-3 block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="brand-name">
        Business name
      </label>
      <input
        id="brand-name"
        value={name}
        maxLength={22}
        onChange={(e) => { setName(e.target.value); flash(5); }}
        className="mt-1 w-full rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500"
      />
      <div className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Colour</div>
      <div className="mt-1.5 flex gap-2">
        {PALETTES.map((x, i) => (
          <button
            type="button"
            key={x.n}
            aria-label={x.n}
            aria-pressed={pal === i}
            onClick={() => { setPal(i); flash(1); }}
            className={`w-9 h-9 rounded-full border-[3px] transition-all active:scale-90 ${pal === i ? "border-slate-900 dark:border-white scale-110" : "border-white dark:border-transparent"} shadow`}
            style={{ background: `linear-gradient(135deg, ${x.c}, ${x.c2})` }}
          />
        ))}
      </div>
      <div className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Font &amp; logo</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {FONTS.map((x, i) => (
          <Chip key={x.n} active={font === i} onClick={() => { setFont(i); flash(2); }}>{x.n}</Chip>
        ))}
        <span className="w-px bg-slate-200 dark:bg-white/15 mx-1" />
        {LOGOS.map((x, i) => (
          <Chip key={x} active={logo === i} onClick={() => { setLogo(i); flash(7); }} label={`Logo ${x}`}>{x}</Chip>
        ))}
      </div>
      <Burst n={burst} emojis={["💼", "✨", "📞"]} count={8} />
    </div>
  );
}

/* ───────────────────────── Content Creator Portfolio (Canva · Notion) ───────────────────────── */

export const CONTENT_CODE = [
  'const types = ["reel", "post", "story", "tip", "none"];',
  "",
  "function nextType(day) {",
  "  const i = types.indexOf(day.type);",
  "  day.type = types[(i + 1) % types.length];",
  "}",
  "",
  'const planned = days.filter((d) => d.type !== "none").length;',
];

const TYPES = ["reel", "post", "story", "tip", "none"] as const;
type PostType = (typeof TYPES)[number];
const LOOK: Record<PostType, { e: string; cls: string; label: string }> = {
  reel: { e: "🎥", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-200", label: "Reel" },
  post: { e: "📝", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200", label: "Post" },
  story: { e: "📖", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200", label: "Story" },
  tip: { e: "💡", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200", label: "Tip" },
  none: { e: "", cls: "bg-slate-50 text-slate-300 dark:bg-white/5 dark:text-white/20", label: "" },
};
const START: PostType[] = [
  "reel", "none", "post", "none", "story", "none", "tip",
  "reel", "none", "post", "story", "none", "reel", "tip",
  "none", "post", "none", "reel", "none", "post", "tip",
  "reel", "none", "post", "none", "story", "reel", "tip",
];

export function ContentOutput({ flash }: DemoProps) {
  const [days, setDays] = useState<PostType[]>(START);
  const [burst, setBurst] = useState(0);

  const cycle = (i: number) => {
    const next = TYPES[(TYPES.indexOf(days[i]) + 1) % TYPES.length];
    setDays((d) => d.map((t, j) => (j === i ? next : t)));
    flash(4);
    setTimeout(() => flash(7), 220);
    if (next !== "none") setBurst((b) => b + 1);
  };

  const planned = days.filter((d) => d !== "none").length;
  const mix = TYPES.slice(0, 4).map((t) => ({ t, n: days.filter((d) => d === t).length }));

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <div className="text-sm font-black text-slate-800 dark:text-slate-100">🗓️ October content plan</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Tap a day to plan a post</div>
        </div>
        <div key={planned} className="demo-pop text-center px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200">
          <div className="text-lg font-black leading-none">{planned}</div>
          <div className="text-[10px] font-bold">of 28 days</div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((t, i) => (
          <button
            type="button"
            key={i}
            onClick={() => cycle(i)}
            aria-label={`Day ${i + 1}: ${LOOK[t].label || "empty"}. Tap to change.`}
            className={`relative aspect-square rounded-lg text-base flex items-center justify-center transition-all active:scale-90 hover:ring-2 hover:ring-purple-400/60 ${LOOK[t].cls}`}
          >
            <span className="absolute left-1 top-0.5 text-[8px] font-bold opacity-60">{i + 1}</span>
            <span key={t} className="demo-pop">{LOOK[t].e}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-white/10">
        {mix.map(({ t, n }) => (
          <div key={t} className={`h-full transition-all duration-500 ${t === "reel" ? "bg-rose-400" : t === "post" ? "bg-blue-400" : t === "story" ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${(n / 28) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
        {mix.map(({ t, n }) => <span key={t}>{LOOK[t].e} {LOOK[t].label} · {n}</span>)}
      </div>
      <button
        type="button"
        onClick={() => { setDays(Array(28).fill("none")); flash(7); }}
        className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400 underline underline-offset-2 hover:text-purple-600"
      >
        Clear the month
      </button>
      <Burst n={burst} emojis={["✨", "🎥", "💡"]} count={6} />
    </div>
  );
}

/* ───────────────────────── Tech Tutoring Service (Notion · Google Sheets · Canva) ───────────────────────── */

export const TUTOR_CODE = [
  'PRICES = {"starter": 5, "standard": 18}   # 18 per 4 sessions',
  "",
  "def total(package, sessions):",
  '    if package == "starter":',
  '        return sessions * PRICES["starter"]',
  "    packs = -(-sessions // 4)",
  '    return packs * PRICES["standard"]',
  "",
  "bookings.append((day, slot))",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = ["4:00", "4:30", "5:00"];
const TAKEN = ["Mon-4:00", "Tue-5:00", "Wed-4:30", "Thu-4:00", "Fri-5:00"];

export function TutorOutput({ flash }: DemoProps) {
  const [pack, setPack] = useState<"starter" | "standard">("starter");
  const [picked, setPicked] = useState<string[]>(["Tue-4:30"]);
  const [confirmed, setConfirmed] = useState(0);

  const total = (p: "starter" | "standard", n: number) => (p === "starter" ? n * 5 : Math.ceil(n / 4) * 18);
  const cost = total(pack, picked.length);

  const pick = (key: string) => {
    if (TAKEN.includes(key)) return;
    setPicked((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
    setConfirmed(0);
    flash(8);
    setTimeout(() => flash(2), 220);
  };

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-black text-slate-800 dark:text-slate-100">💡 CodeBuddy Tutoring</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">● Taking new students</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([
          ["starter", "Starter", "$5 / session", "30 min · basics"],
          ["standard", "Standard", "$18 / 4 sessions", "45 min · projects"],
        ] as const).map(([id, title, price, sub]) => (
          <button
            type="button"
            key={id}
            onClick={() => { setPack(id); setConfirmed(0); flash(0); }}
            aria-pressed={pack === id}
            className={`text-left rounded-xl border-2 p-2.5 transition-all active:scale-[0.97] ${pack === id ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15" : "border-slate-200 dark:border-white/15"}`}
          >
            <div className="text-sm font-black text-slate-800 dark:text-slate-100">{title}</div>
            <div className="text-xs font-black text-blue-600 dark:text-blue-300">{price}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</div>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[38px_repeat(5,1fr)] gap-1 items-center text-[10px] font-black text-slate-400 text-center">
        <span />
        {DAYS.map((d) => <span key={d}>{d}</span>)}
        {SLOTS.map((s) => (
          <div key={s} className="contents">
            <span className="text-right pr-1">{s}</span>
            {DAYS.map((d) => {
              const key = `${d}-${s}`;
              const taken = TAKEN.includes(key);
              const on = picked.includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  disabled={taken}
                  onClick={() => pick(key)}
                  aria-pressed={on}
                  aria-label={`${d} ${s} pm ${taken ? "(taken)" : on ? "(selected)" : ""}`}
                  className={`h-10 rounded-lg text-[10px] font-black transition-all active:scale-90 ${
                    taken
                      ? "bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-white/20 cursor-not-allowed"
                      : on
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md demo-pop"
                      : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  {taken ? "taken" : on ? "✓" : "open"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-400">Times are pm. Tap an open slot to book it.</p>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-900 dark:bg-white/10 text-white p-3">
        <div className="flex-1">
          <div className="text-[11px] text-slate-300">{picked.length} session{picked.length === 1 ? "" : "s"} · {pack === "starter" ? "Starter" : "Standard"}</div>
          <div key={cost} className="text-xl font-black demo-pop inline-block">${cost}</div>
        </div>
        <button
          type="button"
          disabled={!picked.length}
          onClick={() => { setConfirmed((c) => c + 1); flash(6); }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-sm font-black disabled:opacity-40 active:scale-95 transition-transform"
        >
          Confirm booking
        </button>
      </div>
      {confirmed > 0 && (
        <p key={confirmed} className="mt-2 text-center text-xs font-bold text-green-600 dark:text-green-400 demo-rise">
          ✅ Booked! We&apos;ll send the lesson link before the first session.
        </p>
      )}
      <Burst n={confirmed} emojis={["✅", "✨", "💡"]} count={8} />
    </div>
  );
}
