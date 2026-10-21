"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { DemoProps } from "../types";
import { Burst, Chip } from "../ui";

/* ───────────────────────── Mood Detector AI (Python · TensorFlow) ───────────────────────── */

export const MOOD_CODE = [
  "import cv2",
  "from tensorflow.keras.models import load_model",
  "",
  'model = load_model("emotion.h5")',
  'emotions = ["Happy", "Surprised", "Sad", "Angry", "Neutral"]',
  "",
  "face = detect_face(frame)",
  "probs = model.predict(face)[0]",
  "label = emotions[probs.argmax()]",
  'print(f"{label} {probs.max():.0%}")',
];

const MOODS = [
  { id: "Happy", face: "😄", probs: [94, 3, 1, 0, 2] },
  { id: "Surprised", face: "😮", probs: [4, 91, 1, 1, 3] },
  { id: "Sad", face: "😢", probs: [2, 3, 89, 1, 5] },
  { id: "Angry", face: "😠", probs: [1, 2, 4, 90, 3] },
  { id: "Neutral", face: "😐", probs: [6, 3, 4, 2, 85] },
];
const MOOD_EMOJI = ["😄", "😮", "😢", "😠", "😐"];

export function MoodOutput({ flash }: DemoProps) {
  const [mood, setMood] = useState(0);
  const [phase, setPhase] = useState<"scan" | "done">("done");
  const [runId, setRunId] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const detect = (i: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMood(i);
    setPhase("scan");
    setRunId((n) => n + 1);
    flash(6);
    timers.current.push(setTimeout(() => flash(7), 300));
    timers.current.push(setTimeout(() => flash(8), 600));
    timers.current.push(
      setTimeout(() => {
        setPhase("done");
        flash(9);
      }, 950)
    );
  };

  const m = MOODS[mood];
  const done = phase === "done";

  return (
    <div className="select-none">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 h-[200px] flex items-center justify-center border border-slate-600">
        <div className="absolute top-2 left-3 text-[10px] font-mono text-emerald-300">● REC · 24 FPS</div>
        <div className="absolute top-2 right-3 text-[10px] font-mono text-emerald-300">faces: 1</div>
        {/* face */}
        <div key={`f${mood}`} className="demo-pop text-[96px] leading-none drop-shadow-[0_8px_20px_rgba(0,0,0,.5)]">
          {m.face}
        </div>
        {/* detection box */}
        <div
          key={`b${runId}`}
          className={`absolute w-[150px] h-[150px] border-2 border-dashed rounded-lg transition-colors ${
            done ? "border-emerald-300" : "border-amber-300"
          } ${phase === "scan" ? "demo-pop" : ""}`}
        >
          {["top-0 left-0 border-t-4 border-l-4", "top-0 right-0 border-t-4 border-r-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map((c) => (
            <span key={c} className={`absolute w-4 h-4 ${c} ${done ? "border-emerald-300" : "border-amber-300"}`} />
          ))}
        </div>
        {phase === "scan" && (
          <div key={`s${runId}`} className="absolute left-[calc(50%-80px)] top-[25px] w-40 h-0.5 bg-emerald-300 shadow-[0_0_14px_3px_rgba(110,231,183,.8)] demo-scan" style={{ "--scan-h": "150px" } as CSSProperties} />
        )}
        <div
          className={`absolute bottom-3 px-3 py-1 rounded-md text-xs font-black font-mono transition-all ${
            done ? "bg-emerald-300 text-emerald-950 demo-pop" : "bg-amber-300 text-amber-950"
          }`}
          key={`l${runId}${phase}`}
        >
          {done ? `${m.id} ${m.face}  ${Math.max(...m.probs)}%` : "Scanning…"}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {MOODS.map((x, i) => {
          const v = done ? m.probs[i] : 0;
          return (
            <div key={x.id} className="grid grid-cols-[22px_1fr_36px] items-center gap-2 text-xs">
              <span>{MOOD_EMOJI[i]}</span>
              <div className="h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${i === MOODS.findIndex((y) => y.id === m.id) ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : "bg-slate-400/70"}`}
                  style={{ width: `${v}%` }}
                />
              </div>
              <span className="text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">{v}%</span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pretend to make a face:</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {MOODS.map((x, i) => (
          <Chip key={x.id} active={mood === i} onClick={() => detect(i)} label={`Show a ${x.id} face`}>
            {x.face} {x.id}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Recipe Chatbot (Python · OpenAI API) ───────────────────────── */

export const CHEF_CODE = [
  "import openai",
  "",
  'ingredients = ["egg", "rice"]',
  'prompt = f"Suggest a recipe using {ingredients}"',
  "",
  "reply = client.chat.completions.create(",
  '    model="gpt-4o-mini",',
  '    messages=[{"role": "user", "content": prompt}],',
  ")",
  "print(reply.choices[0].message.content)",
];

const FOOD = [
  { id: "egg", e: "🥚", name: "egg" },
  { id: "rice", e: "🍚", name: "rice" },
  { id: "tomato", e: "🍅", name: "tomato" },
  { id: "potato", e: "🥔", name: "potato" },
  { id: "cheese", e: "🧀", name: "cheese" },
  { id: "chili", e: "🌶️", name: "green chilli" },
];

interface Recipe { needs: string[]; title: string; emoji: string; time: string; steps: string[] }
const RECIPES: Recipe[] = [
  { needs: ["egg", "rice", "chili"], title: "Spicy Egg Fried Rice", emoji: "🍳", time: "20 min", steps: ["Fry chopped chilli in a little oil.", "Scramble the eggs in the same pan.", "Add rice and toss on high heat for 3 minutes."] },
  { needs: ["egg", "rice"], title: "Egg Fried Rice", emoji: "🍳", time: "15 min", steps: ["Scramble two eggs in a hot pan.", "Add cooked rice, salt and pepper.", "Toss for 3 minutes and serve warm."] },
  { needs: ["potato", "chili"], title: "Crispy Spicy Aloo Fry", emoji: "🥔", time: "25 min", steps: ["Cut potatoes into thin sticks.", "Fry until golden, then add chilli and salt.", "Toss well and enjoy hot."] },
  { needs: ["potato", "cheese"], title: "Cheesy Potato Bake", emoji: "🧀", time: "30 min", steps: ["Slice and boil the potatoes for 8 minutes.", "Layer them in a dish with cheese.", "Bake until bubbly and golden."] },
  { needs: ["cheese", "tomato"], title: "Cheesy Tomato Toast", emoji: "🍞", time: "10 min", steps: ["Slice the tomato and place on toast.", "Top with cheese.", "Grill for 4 minutes until melted."] },
  { needs: ["egg", "tomato"], title: "Tomato Scramble", emoji: "🍅", time: "12 min", steps: ["Cook chopped tomato until soft.", "Pour in beaten eggs and stir gently.", "Season and serve with bread."] },
  { needs: ["egg", "cheese"], title: "Cheese Omelette", emoji: "🍳", time: "8 min", steps: ["Beat the eggs with a pinch of salt.", "Pour into a pan and add cheese.", "Fold and cook for 1 minute."] },
  { needs: ["rice", "chili"], title: "Spicy Masala Rice", emoji: "🍚", time: "18 min", steps: ["Sauté chilli with a little oil.", "Add rice and a pinch of turmeric.", "Mix well and serve hot."] },
];

function pickRecipe(sel: string[]): Recipe {
  const fit = RECIPES.filter((r) => r.needs.every((n) => sel.includes(n))).sort((a, b) => b.needs.length - a.needs.length);
  if (fit[0]) return fit[0];
  const names = sel.map((id) => FOOD.find((f) => f.id === id)?.name ?? id);
  return {
    needs: sel,
    title: `Chef's Surprise Bowl`,
    emoji: "🥣",
    time: "15 min",
    steps: [`Chop or slice the ${names.join(" and ")}.`, "Cook gently in a pan with a little oil.", "Season with salt and pepper and enjoy!"],
  };
}

interface Msg { who: "me" | "bot"; text: string; recipe?: Recipe }

export function ChefOutput({ flash }: DemoProps) {
  const [sel, setSel] = useState<string[]>(["egg", "rice"]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [burst, setBurst] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const el = endRef.current?.parentElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const toggle = (id: string) => {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    flash(2);
  };

  const ask = () => {
    if (!sel.length || typing) return;
    const names = sel.map((id) => FOOD.find((f) => f.id === id)!);
    setMsgs((m) => [...m, { who: "me", text: `I have ${names.map((n) => `${n.e} ${n.name}`).join(", ")}. What can I cook?` }]);
    setTyping(true);
    flash(3);
    timers.current.push(setTimeout(() => flash(5), 350));
    timers.current.push(
      setTimeout(() => {
        const recipe = pickRecipe(sel);
        setMsgs((m) => [...m, { who: "bot", text: `How about ${recipe.title}?`, recipe }]);
        setTyping(false);
        setBurst((b) => b + 1);
        flash(9);
      }, 1200)
    );
  };

  return (
    <div className="relative select-none">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1A30] overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-black flex items-center gap-2">
          🍲 Chef Bot <span className="ml-auto text-[10px] font-semibold opacity-90">● online</span>
        </div>
        <div className="h-[210px] overflow-y-auto px-3 py-3 space-y-2.5">
          {!msgs.length && !typing && (
            <div className="text-center text-xs text-slate-400 mt-14">Pick what&apos;s in your kitchen, then ask Chef Bot 👇</div>
          )}
          {msgs.map((m, i) =>
            m.who === "me" ? (
              <div key={i} className="flex justify-end demo-rise">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-purple-600 text-white text-xs px-3 py-2">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-2 demo-rise">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-sm flex-none">🤖</div>
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 text-xs px-3 py-2">
                  <div className="font-black text-sm mb-0.5">{m.recipe?.emoji} {m.recipe?.title}</div>
                  <div className="text-[10px] font-bold text-orange-600 dark:text-orange-300 mb-1">⏱ {m.recipe?.time} · 🍽 Serves 2</div>
                  <ol className="list-decimal ml-4 space-y-0.5">
                    {m.recipe?.steps.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-sm">🤖</div>
              <div className="rounded-2xl bg-slate-100 dark:bg-white/10 px-3 py-2 flex gap-1">
                {[0, 1, 2].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-500 demo-blink" style={{ animationDelay: `${d * 0.18}s` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">What&apos;s in your kitchen?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {FOOD.map((f) => (
          <Chip key={f.id} active={sel.includes(f.id)} onClick={() => toggle(f.id)} label={f.name}>
            {f.e} {f.name}
          </Chip>
        ))}
      </div>
      <button
        type="button"
        onClick={ask}
        disabled={!sel.length || typing}
        className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-black disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {typing ? "Chef Bot is thinking…" : "Ask Chef Bot 🍳"}
      </button>
      <Burst n={burst} emojis={["🍳", "✨", "🍅", "🧀"]} />
    </div>
  );
}

/* ───────────────────────── Smart Study Planner (Python · OpenAI API) ───────────────────────── */

export const PLANNER_CODE = [
  'topics = {"Algebra": 3, "Chemistry": 2, "Grammar": 1}',
  "hours_per_day = 2",
  "",
  "def make_plan(topics, hours):",
  "    ranked = sorted(topics, key=topics.get, reverse=True)",
  "    plan = {}",
  "    for day in DAYS:",
  "        plan[day] = ranked[:hours]",
  "        ranked.append(ranked.pop(0))",
  "    return plan",
  "",
  "def mark_done(session):",
  "    progress += 1",
];

const SUBJECTS = [
  { id: "Algebra", e: "📐", c: "from-violet-500 to-indigo-500" },
  { id: "Chemistry", e: "🧪", c: "from-sky-500 to-blue-600" },
  { id: "Grammar", e: "📖", c: "from-amber-500 to-orange-500" },
  { id: "Physics", e: "⚡", c: "from-fuchsia-500 to-pink-600" },
  { id: "History", e: "🏛️", c: "from-emerald-500 to-teal-600" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Mirrors make_plan() in the code pane: hardest topics first, rotating each day, Sunday off. */
function makePlan(topics: string[], hours: number): string[][] | null {
  if (!topics.length) return null;
  const ranked = [...topics];
  return DAYS.map((_, i) => {
    if (i === 6) return [];
    const sessions = ranked.slice(0, Math.min(hours, ranked.length));
    ranked.push(ranked.shift()!);
    return sessions;
  });
}

export function PlannerOutput({ flash }: DemoProps) {
  const [picked, setPicked] = useState<string[]>(["Algebra", "Chemistry", "Grammar"]);
  const [hours, setHours] = useState(2);
  const [plan, setPlan] = useState<string[][] | null>(() => makePlan(["Algebra", "Chemistry", "Grammar"], 2));
  const [runId, setRunId] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [burst, setBurst] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const build = (ts = picked, h = hours) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPlan(makePlan(ts, h));
    setDone([]);
    setRunId((n) => n + 1);
    if (!ts.length) return;
    [3, 4, 6, 7, 8].forEach((line, i) => timers.current.push(setTimeout(() => flash(line), i * 160)));
  };

  const toggleTopic = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    flash(0);
    build(next, hours);
  };
  const changeHours = (h: number) => {
    setHours(h);
    flash(1);
    build(picked, h);
  };
  const tick = (key: string) => {
    if (done.includes(key)) {
      setDone(done.filter((k) => k !== key));
      return;
    }
    setDone([...done, key]);
    setBurst((b) => b + 1);
    flash(12);
  };

  const total = plan ? plan.reduce((a, d) => a + d.length, 0) : 0;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  return (
    <div className="relative select-none">
      <div className="flex items-center gap-3 mb-3 p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div
          className="w-12 h-12 rounded-full grid place-items-center flex-none transition-[background] duration-500"
          style={{ background: `conic-gradient(#fde047 ${pct * 3.6}deg, rgba(255,255,255,.25) 0)` }}
        >
          <div className="w-9 h-9 rounded-full bg-indigo-700 grid place-items-center text-[11px] font-black">{pct}%</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black">Your week, planned 📅</div>
          <div className="text-[11px] opacity-90">{done.length} of {total} sessions done · tap a session to tick it off</div>
        </div>
        <div className="text-center flex-none">
          <div className="text-xl leading-none">🔥</div>
          <div className="text-[10px] font-bold">{Math.min(7, 2 + done.length)} day streak</div>
        </div>
      </div>

      <div key={runId} className="space-y-1.5 min-h-[196px]">
        {plan ? (
          plan.map((sessions, i) => (
            <div key={DAYS[i]} className="flex items-center gap-2 demo-rise" style={{ animationDelay: `${i * 55}ms` }}>
              <span className="w-8 text-[11px] font-black text-slate-500 dark:text-slate-400">{DAYS[i]}</span>
              <div className="flex-1 flex gap-1.5 min-h-[28px]">
                {sessions.length ? (
                  sessions.map((s, j) => {
                    const sub = SUBJECTS.find((x) => x.id === s)!;
                    const key = `${i}-${j}`;
                    const isDone = done.includes(key);
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => tick(key)}
                        aria-pressed={isDone}
                        className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-bold text-white bg-gradient-to-r ${sub.c} text-left transition-all active:scale-95 ${isDone ? "opacity-50 line-through" : "hover:brightness-110"}`}
                      >
                        {isDone ? "✅" : sub.e} {sub.id}
                      </button>
                    );
                  })
                ) : (
                  <span className="flex-1 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/15 text-[11px] text-slate-400 px-2 py-1">🌴 Rest &amp; review</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-xs text-slate-400 pt-16">Pick at least one weak topic below ⬇️</div>
        )}
      </div>

      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">My weak topics (hardest first)</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {SUBJECTS.map((s) => (
          <Chip key={s.id} active={picked.includes(s.id)} onClick={() => toggleTopic(s.id)}>
            {s.e} {s.id}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
        ⏰ Hours per day:
        {[1, 2, 3].map((h) => (
          <Chip key={h} active={hours === h} onClick={() => changeHours(h)}>{h}</Chip>
        ))}
      </div>
      <Burst n={burst} emojis={["✅", "✨", "🔥"]} count={8} />
    </div>
  );
}
