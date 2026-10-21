"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoProps } from "../types";
import { Burst, Chip, useCanvas } from "../ui";

/* ───────────────────────── Safari Adventure Game (Scratch) ───────────────────────── */

export const SAFARI_CODE = [
  "events:when this sprite clicked",
  "  variables:change [animals found] by 1",
  "  looks:say [You found me!] for 2 seconds",
  "  sound:play sound [Lion Roar]",
  "  control:if <animals found = 5> then",
  "    looks:switch backdrop to [Party]",
];

const SPOTS = [
  { id: "lion", animal: "🦁", cover: "🌳", x: 14, y: 40, size: 44 },
  { id: "elephant", animal: "🐘", cover: "🪨", x: 60, y: 56, size: 46 },
  { id: "giraffe", animal: "🦒", cover: "🌳", x: 80, y: 24, size: 48 },
  { id: "zebra", animal: "🦓", cover: "🌿", x: 36, y: 74, size: 40 },
  { id: "monkey", animal: "🐒", cover: "🌿", x: 84, y: 76, size: 36 },
];

export function SafariOutput({ flash }: DemoProps) {
  const [found, setFound] = useState<string[]>([]);
  const [say, setSay] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const tap = (id: string) => {
    if (found.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    setSay(id);
    setBurst((b) => b + 1);
    flash(1);
    timers.current.push(setTimeout(() => flash(2), 220));
    timers.current.push(setTimeout(() => flash(3), 440));
    timers.current.push(setTimeout(() => setSay((s) => (s === id ? null : s)), 1600));
    if (next.length === SPOTS.length) {
      timers.current.push(setTimeout(() => flash(4), 700));
      timers.current.push(setTimeout(() => flash(5), 950));
    }
  };

  const won = found.length === SPOTS.length;

  return (
    <div className="select-none">
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-amber-300/60 shadow-md" style={{ aspectRatio: "4 / 3" }}>
        <div className={`absolute inset-0 transition-all duration-700 ${won ? "bg-gradient-to-b from-fuchsia-400 via-amber-300 to-orange-300" : "bg-gradient-to-b from-sky-400 via-amber-100 to-amber-400"}`} />
        <div className="absolute right-5 top-3 text-4xl demo-float">{won ? "🎉" : "☀️"}</div>
        <div className="absolute left-4 top-6 text-3xl opacity-90 demo-float">☁️</div>
        <div className="absolute left-[44%] top-10 text-2xl opacity-80 demo-float" style={{ animationDelay: "1s" }}>☁️</div>
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-[50%/22%]" />

        {SPOTS.map((s) => {
          const isFound = found.includes(s.id);
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => tap(s.id)}
              aria-label={isFound ? `${s.id} found` : "Look behind this bush"}
              className="absolute -translate-x-1/2 -translate-y-1/2 active:scale-90 transition-transform"
              style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size }}
            >
              <span className={isFound ? "demo-wiggle inline-block" : "inline-block"}>{isFound ? s.animal : ""}</span>
              {!isFound && <span className="inline-block hover:scale-110 transition-transform">{s.cover}</span>}
              {isFound && <span className="absolute -right-2 -bottom-1 text-base">{s.cover === "🪨" ? "🪨" : ""}</span>}
              {say === s.id && (
                <span className="demo-pop absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap rounded-2xl bg-white text-slate-800 border-2 border-slate-300 px-2.5 py-1 text-xs font-black" style={{ fontSize: 11 }}>
                  You found me! 🎉
                </span>
              )}
            </button>
          );
        })}

        <div className="absolute left-2 top-2 rounded-md bg-orange-500 text-white text-[11px] font-black px-2 py-1 shadow">
          animals found: {found.length}
        </div>
        {!found.length && (
          <div className="absolute inset-x-0 bottom-2 text-center text-[11px] font-black text-amber-950/80">👆 Tap the bushes and rocks to find the hidden animals!</div>
        )}
        {won && (
          <div className="absolute inset-0 bg-purple-900/55 flex flex-col items-center justify-center gap-2 demo-pop">
            <div className="text-4xl">🏆</div>
            <div className="text-white font-black text-lg">You found all 5 animals!</div>
            <button
              type="button"
              onClick={() => { setFound([]); setSay(null); }}
              className="px-5 py-2 rounded-full bg-white text-purple-700 text-sm font-black hover:scale-105 active:scale-95 transition-transform"
            >
              Play again
            </button>
          </div>
        )}
        <Burst n={burst} emojis={["⭐", "✨", "🎉"]} count={8} />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {SPOTS.map((s) => (
          <span key={s.id} className={`w-10 h-10 rounded-xl border-2 grid place-items-center text-xl transition-all ${found.includes(s.id) ? "border-purple-500 bg-purple-100 dark:bg-purple-500/20 demo-pop" : "border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 grayscale opacity-50"}`}>
            {s.animal}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Space Maths Quiz (Scratch) ───────────────────────── */

export const MATHS_CODE = [
  "events:when green flag clicked",
  "  variables:set [score] to 0",
  "  control:repeat 5",
  "    variables:set [a] to (pick random 2 to 9)",
  "    variables:set [b] to (pick random 2 to 9)",
  "    sensing:ask [a × b = ?] and wait",
  "    control:if <answer = a × b> then",
  "      variables:change [score] by 1",
  "      sound:play sound [Laser]",
];

interface Round { a: number; b: number; options: number[] }
const ROUNDS = 5;

function makeRound(): Round {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const right = a * b;
  const wrong = new Set<number>();
  while (wrong.size < 2) {
    const d = (1 + Math.floor(Math.random() * 4)) * (Math.random() < 0.5 ? -1 : 1);
    if (right + d > 0 && right + d !== right) wrong.add(right + d);
  }
  const options = [right, ...wrong].sort(() => Math.random() - 0.5);
  return { a, b, options };
}

export function MathsOutput({ flash }: DemoProps) {
  // First round is fixed so the very first render is identical on every load.
  const [round, setRound] = useState<Round>({ a: 7, b: 8, options: [54, 56, 63] });
  const [n, setN] = useState(1);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0); // how close the asteroid is (0-3)
  const [state, setState] = useState<"ask" | "boom" | "crash">("ask");
  const [wrong, setWrong] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [finished, setFinished] = useState(false);
  const timers = useRef<ReadonlyArray<ReturnType<typeof setTimeout>>>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current = [...timers.current, setTimeout(fn, ms)];
  };
  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const nextRound = (add: number) => {
    const total = n;
    if (total >= ROUNDS) {
      setFinished(true);
      if (add) setBurst((b) => b + 1);
      return;
    }
    setRound(makeRound());
    setN(total + 1);
    setStep(0);
    setState("ask");
    setWrong(null);
    flash(3);
    later(() => flash(4), 150);
    later(() => flash(5), 300);
  };

  const answer = (v: number) => {
    if (state !== "ask") return;
    flash(6);
    if (v === round.a * round.b) {
      setState("boom");
      setScore((s) => s + 1);
      setBurst((b) => b + 1);
      later(() => flash(7), 200);
      later(() => flash(8), 400);
      later(() => nextRound(1), 1000);
    } else {
      setWrong(v);
      const s = step + 1;
      setStep(s);
      later(() => setWrong(null), 400);
      if (s >= 3) {
        setState("crash");
        later(() => nextRound(0), 1400);
      }
    }
  };

  const restart = () => {
    setRound({ a: 7, b: 8, options: [54, 56, 63] });
    setN(1);
    setScore(0);
    setStep(0);
    setState("ask");
    setFinished(false);
  };

  return (
    <div className="select-none">
      <div className="relative rounded-2xl overflow-hidden border border-indigo-900 bg-gradient-to-b from-[#0B1030] via-[#1B1450] to-[#2A1B6B]" style={{ height: 250 }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <span key={i} className="absolute w-px h-px bg-white rounded-full" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, opacity: 0.3 + (i % 4) * 0.2, boxShadow: "0 0 3px #fff" }} />
        ))}
        <div className="absolute left-2 top-2 rounded-md bg-orange-500 text-white text-[11px] font-black px-2 py-1">score: {score}</div>
        <div className="absolute right-2 top-2 rounded-md bg-white/10 text-white text-[11px] font-black px-2 py-1">Round {Math.min(n, ROUNDS)} / {ROUNDS}</div>

        {!finished && (
          <>
            <div
              className={`absolute left-1/2 -translate-x-1/2 transition-all duration-500 ease-out ${wrong !== null ? "demo-shake" : ""}`}
              style={{ top: 28 + step * 40 }}
            >
              <div className="relative w-[96px] h-[84px] grid place-items-center">
                <span className={`text-[84px] leading-none drop-shadow-[0_6px_10px_rgba(0,0,0,.5)] ${state === "boom" ? "opacity-0" : "demo-float"}`}>🪨</span>
                {state === "ask" && <span className="absolute text-white font-black text-lg [text-shadow:0_2px_4px_rgba(0,0,0,.7)]">{round.a} × {round.b}</span>}
                {state === "boom" && <span className="absolute text-6xl demo-pop">💥</span>}
                {state === "crash" && <span className="absolute text-6xl demo-pop">💥</span>}
              </div>
            </div>
            {state === "boom" && <div className="absolute left-1/2 -translate-x-1/2 w-1.5 rounded bg-gradient-to-t from-cyan-300 to-transparent demo-rise" style={{ top: 100, bottom: 58 }} />}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[50px] text-4xl">🚀</div>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-2">
              {round.options.map((o) => (
                <button
                  type="button"
                  key={o}
                  onClick={() => answer(o)}
                  disabled={state !== "ask"}
                  className={`flex-1 max-w-[96px] py-2 rounded-xl text-lg font-black text-white border-2 transition-all active:scale-90 ${
                    wrong === o ? "bg-rose-500 border-rose-200" : state !== "ask" && o === round.a * round.b ? "bg-green-500 border-white" : "bg-purple-600 hover:bg-purple-500 border-white/50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <div className="absolute left-0 right-0 text-center top-1.5 text-[11px] font-black text-amber-300">
              {state === "crash" ? "Oh no, it landed! The answer was " + round.a * round.b : `What is ${round.a} × ${round.b}?`}
            </div>
          </>
        )}
        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 demo-pop">
            <div className="text-5xl">🌍</div>
            <div className="text-white font-black text-lg text-center px-4">You saved Earth from {score} of {ROUNDS} asteroids!</div>
            <button type="button" onClick={restart} className="mt-1 px-5 py-2 rounded-full bg-white text-purple-700 text-sm font-black hover:scale-105 active:scale-95 transition-transform">
              Play again
            </button>
          </div>
        )}
        <Burst n={burst} emojis={["⭐", "💥", "✨"]} count={8} />
      </div>
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Pick the right answer to blast the asteroid. Wrong answers bring it closer!</p>
    </div>
  );
}

/* ───────────────────────── Python Drawing Robot (Python · Turtle) ───────────────────────── */

export const ROBOT_CODE = [
  "import turtle",
  "",
  "robot = turtle.Turtle()",
  'robot.color("purple")',
  "",
  "for i in range(36):",
  "    robot.forward(100)",
  "    robot.left(170)",
];

type Cmd = ["f", number] | ["l", number] | ["r", number];
interface Seg { x1: number; y1: number; x2: number; y2: number; c: string }

const CW = 320;
const CH = 240;
const COLORS = [
  { n: "purple", c: "#7C3AED" },
  { n: "blue", c: "#2563EB" },
  { n: "hotpink", c: "#EC4899" },
  { n: "orange", c: "#F97316" },
];

function preset(name: string): Cmd[] {
  const out: Cmd[] = [];
  if (name === "square") for (let i = 0; i < 4; i++) out.push(["f", 90], ["l", 90]);
  if (name === "star") for (let i = 0; i < 5; i++) out.push(["f", 120], ["l", 144]);
  if (name === "spiral") for (let i = 0; i < 48; i++) out.push(["f", 4 + i * 3], ["l", 91]);
  if (name === "flower") for (let i = 0; i < 18; i++) { for (let k = 0; k < 4; k++) out.push(["f", 46], ["l", 90]); out.push(["l", 20]); }
  return out;
}

export function RobotOutput({ flash }: DemoProps) {
  const g = useRef({
    segs: [] as Seg[],
    x: CW / 2,
    y: CH / 2,
    a: 0,
    color: COLORS[0].c,
    queue: [] as Cmd[],
    acc: 0,
  });
  const [log, setLog] = useState<string[]>([]);
  const [color, setColor] = useState(0);
  const [drawn, setDrawn] = useState(0);

  const exec = (cmd: Cmd) => {
    const s = g.current;
    if (cmd[0] === "f") {
      const nx = s.x + Math.cos((s.a * Math.PI) / 180) * cmd[1];
      const ny = s.y - Math.sin((s.a * Math.PI) / 180) * cmd[1];
      s.segs.push({ x1: s.x, y1: s.y, x2: nx, y2: ny, c: s.color });
      s.x = nx;
      s.y = ny;
    } else if (cmd[0] === "l") s.a += cmd[1];
    else s.a -= cmd[1];
    const text = cmd[0] === "f" ? `robot.forward(${cmd[1]})` : cmd[0] === "l" ? `robot.left(${cmd[1]})` : `robot.right(${cmd[1]})`;
    setLog((l) => [...l.slice(-2), text]);
    setDrawn(s.segs.length);
  };

  const ref = useCanvas(CW, CH, (ctx, dt) => {
    const s = g.current;
    s.acc += dt;
    let guard = 0;
    while (s.acc > 0.028 && s.queue.length && guard++ < 6) {
      s.acc -= 0.028;
      exec(s.queue.shift()!);
    }
    if (!s.queue.length) s.acc = 0;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = "#EEF2FF";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CW; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = 0; y <= CH; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    for (const sg of s.segs) {
      ctx.strokeStyle = sg.c;
      ctx.beginPath();
      ctx.moveTo(sg.x1, sg.y1);
      ctx.lineTo(sg.x2, sg.y2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((-s.a * Math.PI) / 180);
    ctx.fillStyle = "#16A34A";
    ctx.strokeStyle = "#14532D";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  const run = (cmd: Cmd) => {
    exec(cmd);
    flash(cmd[0] === "f" ? 6 : 7);
  };
  const runPreset = (name: string) => {
    const s = g.current;
    s.segs = [];
    s.x = CW / 2;
    s.y = CH / 2;
    s.a = name === "spiral" ? 0 : name === "star" ? 18 : 0;
    s.queue = preset(name);
    setDrawn(0);
    flash(5);
    setTimeout(() => flash(6), 180);
    setTimeout(() => flash(7), 360);
  };
  const clear = () => {
    const s = g.current;
    s.segs = [];
    s.queue = [];
    s.x = CW / 2;
    s.y = CH / 2;
    s.a = 0;
    setDrawn(0);
    setLog([]);
  };
  const pickColor = (i: number) => {
    setColor(i);
    g.current.color = COLORS[i].c;
    flash(3);
  };

  const btn = "px-3 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-700 active:scale-90 transition-all";

  return (
    <div className="select-none">
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-white" style={{ aspectRatio: `${CW} / ${CH}` }}>
        <canvas ref={ref} className="absolute inset-0 w-full h-full" role="img" aria-label="Turtle drawing canvas" />
        {drawn === 0 && <div className="absolute inset-x-0 bottom-3 text-center text-xs font-bold text-slate-400 pointer-events-none">Press a button to make the robot draw ✏️</div>}
      </div>
      <div className="mt-2 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] px-3 py-2 min-h-[3.4rem] leading-5">
        {log.length ? log.map((l, i) => <div key={i + l}>{`>>> ${l}`}</div>) : <span className="text-slate-500">{">>> waiting for commands…"}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={() => run(["f", 40])}>▲ Forward</button>
        <button type="button" className={btn} onClick={() => run(["l", 90])}>↶ Left 90°</button>
        <button type="button" className={btn} onClick={() => run(["r", 90])}>↷ Right 90°</button>
        <button type="button" className="px-3 py-2 rounded-xl text-xs font-bold border-2 border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-200 active:scale-90" onClick={clear}>🧹 Clear</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Draw:</span>
        {[
          ["square", "⬜ Square"],
          ["star", "⭐ Star"],
          ["spiral", "🌀 Spiral"],
          ["flower", "🌸 Flower"],
        ].map(([id, label]) => (
          <Chip key={id} onClick={() => runPreset(id)}>{label}</Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Colour:</span>
        {COLORS.map((c, i) => (
          <button
            type="button"
            key={c.n}
            aria-label={c.n}
            aria-pressed={color === i}
            onClick={() => pickColor(i)}
            className={`w-7 h-7 rounded-full border-2 transition-all active:scale-90 ${color === i ? "border-slate-900 dark:border-white scale-110" : "border-transparent"}`}
            style={{ background: c.c }}
          />
        ))}
      </div>
    </div>
  );
}
