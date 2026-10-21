"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  Hero "creation" visual: a tiny playable game next to the code that makes it.
  The ship and speed chips edit the code on screen AND change the game, so a
  child sees "I changed a line, the world changed". Works with mouse, touch
  (drag) and keyboard (← →), and idles in an autopilot demo until someone plays.
*/

const W = 360;
const H = 232;
const SHIP_Y = H - 34;

type Phase = "idle" | "playing" | "over";
type Kind = "star" | "rock";

interface Item {
  x: number;
  y: number;
  vy: number;
  kind: Kind;
  spin: number;
}
interface Pop {
  x: number;
  y: number;
  age: number;
  text: string;
  color: string;
}

const SHIPS = [
  { glyph: "🚀", tilt: -Math.PI / 4 },
  { glyph: "🛸", tilt: 0 },
  { glyph: "🦄", tilt: 0 },
];
const SPEEDS = [1, 2, 3];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// Static starfield, generated once so SSR/CSR never disagree.
const STARFIELD = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 83.7) % W,
  y: (i * 47.3) % H,
  r: 0.5 + ((i * 7) % 5) * 0.28,
  p: (i * 1.7) % 6.28,
  v: 6 + ((i * 11) % 7) * 3,
}));

export default function HeroGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [shipIdx, setShipIdx] = useState(0);
  const [speed, setSpeed] = useState(2);
  const [flash, setFlash] = useState<"score" | "lives" | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Everything the animation loop reads lives in refs so it never restarts.
  const phaseRef = useRef<Phase>("idle");
  const shipRef = useRef(SHIPS[0]);
  const speedRef = useRef(2);
  const g = useRef({
    items: [] as Item[],
    pops: [] as Pop[],
    shipX: W / 2,
    targetX: W / 2,
    score: 0,
    lives: 3,
    t: 0,
    spawn: 0.4,
    shake: 0,
    dir: 0,
    keys: { left: false, right: false },
    visible: true,
    reduced: false,
  });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    shipRef.current = SHIPS[shipIdx];
  }, [shipIdx]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const pulse = useCallback((which: "score" | "lives") => {
    setFlash(which);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 320);
  }, []);

  const start = useCallback(() => {
    const s = g.current;
    s.items = [];
    s.pops = [];
    s.score = 0;
    s.lives = 3;
    s.t = 0;
    s.spawn = 0.3;
    s.shipX = W / 2;
    s.targetX = W / 2;
    setScore(0);
    setLives(3);
    phaseRef.current = "playing";
    setPhase("playing");
    kickRef.current?.();
  }, []);

  /* ── animation loop ───────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = g.current;
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = 0;
    let running = false;

    const shouldRun = () =>
      s.visible &&
      !document.hidden &&
      (phaseRef.current === "playing" || (phaseRef.current === "idle" && !s.reduced));

    const spawn = (playing: boolean) => {
      const rockChance = playing ? 0.3 + Math.min(0.15, s.t * 0.004) : 0.18;
      s.items.push({
        x: 18 + Math.random() * (W - 36),
        y: -20,
        vy: 62 + 34 * speedRef.current + Math.random() * 26,
        kind: Math.random() < rockChance ? "rock" : "star",
        spin: Math.random() * 6.28,
      });
    };

    const step = (dt: number) => {
      const playing = phaseRef.current === "playing";
      s.t += dt;
      s.shake = Math.max(0, s.shake - dt * 4);

      // spawn
      s.spawn -= dt;
      if (s.spawn <= 0) {
        spawn(playing);
        s.spawn = Math.max(0.3, 0.95 - 0.18 * speedRef.current - (playing ? s.t * 0.004 : 0));
      }

      // steering
      if (playing) {
        const d = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0) || s.dir;
        if (d) s.targetX = Math.max(16, Math.min(W - 16, s.targetX + d * 300 * dt));
      } else {
        // autopilot: chase the lowest star, otherwise sway
        let pick: Item | null = null;
        for (const it of s.items) {
          if (it.kind === "star" && it.y < SHIP_Y - 10 && (!pick || it.y > pick.y)) pick = it;
        }
        s.targetX = pick ? pick.x : W / 2 + Math.sin(s.t * 0.8) * 90;
      }
      s.shipX += (s.targetX - s.shipX) * Math.min(1, dt * (playing ? 14 : 5));

      // items
      for (const it of s.items) {
        it.y += it.vy * dt;
        it.spin += dt * 3;
      }
      for (let i = s.items.length - 1; i >= 0; i--) {
        const it = s.items[i];
        const hit = Math.abs(it.x - s.shipX) < 22 && Math.abs(it.y - SHIP_Y) < 22;
        if (hit) {
          s.items.splice(i, 1);
          if (it.kind === "star") {
            s.pops.push({ x: it.x, y: it.y, age: 0, text: "+1", color: "#FDE68A" });
            if (playing) {
              s.score += 1;
              setScore(s.score);
              pulse("score");
            }
          } else {
            s.pops.push({ x: it.x, y: it.y, age: 0, text: playing ? "−1 ❤️" : "💥", color: "#FCA5A5" });
            s.shake = 1;
            if (playing) {
              s.lives -= 1;
              setLives(s.lives);
              pulse("lives");
              if (s.lives <= 0) {
                phaseRef.current = "over";
                setPhase("over");
                setBest((b) => Math.max(b, s.score));
              }
            }
          }
        } else if (it.y > H + 24) {
          s.items.splice(i, 1);
        }
      }
      for (const p of s.pops) p.age += dt;
      s.pops = s.pops.filter((p) => p.age < 0.7);
    };

    const draw = () => {
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 6 * s.shake, (Math.random() - 0.5) * 6 * s.shake);

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0A1030");
      sky.addColorStop(0.6, "#1E1565");
      sky.addColorStop(1, "#33207F");
      ctx.fillStyle = sky;
      ctx.fillRect(-8, -8, W + 16, H + 16);
      const neb = ctx.createRadialGradient(W * 0.78, H * 0.28, 4, W * 0.78, H * 0.28, 120);
      neb.addColorStop(0, "rgba(96,165,250,0.35)");
      neb.addColorStop(1, "rgba(96,165,250,0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);
      const neb2 = ctx.createRadialGradient(W * 0.18, H * 0.7, 4, W * 0.18, H * 0.7, 110);
      neb2.addColorStop(0, "rgba(168,85,247,0.32)");
      neb2.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);

      // starfield drifting down
      for (const st of STARFIELD) {
        const y = (st.y + s.t * st.v) % H;
        const a = 0.35 + 0.35 * Math.sin(s.t * 2 + st.p);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(st.x, y, st.r, 0, 6.283);
        ctx.fill();
      }

      // planet horizon
      const hz = ctx.createLinearGradient(0, H - 26, 0, H);
      hz.addColorStop(0, "rgba(124,58,237,0)");
      hz.addColorStop(1, "rgba(124,58,237,0.45)");
      ctx.fillStyle = hz;
      ctx.fillRect(0, H - 26, W, 26);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // items
      for (const it of s.items) {
        ctx.save();
        ctx.translate(it.x, it.y);
        if (it.kind === "star") {
          ctx.shadowColor = "rgba(253,224,71,0.9)";
          ctx.shadowBlur = 12;
          ctx.scale(1 + Math.sin(it.spin) * 0.12, 1 + Math.sin(it.spin) * 0.12);
          ctx.font = `22px ${EMOJI_FONT}`;
          ctx.fillText("⭐", 0, 0);
        } else {
          ctx.rotate(Math.sin(it.spin) * 0.3);
          ctx.font = `24px ${EMOJI_FONT}`;
          ctx.fillText("☄️", 0, 0);
        }
        ctx.restore();
      }

      // ship (+ engine glow)
      const ship = shipRef.current;
      const vx = s.targetX - s.shipX;
      ctx.save();
      ctx.translate(s.shipX, SHIP_Y);
      const flame = ctx.createRadialGradient(0, 20, 1, 0, 20, 16);
      flame.addColorStop(0, "rgba(251,191,36,0.85)");
      flame.addColorStop(1, "rgba(251,146,60,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(0, 20, 9, 14 + Math.sin(s.t * 30) * 2, 0, 0, 6.283);
      ctx.fill();
      ctx.rotate(ship.tilt + Math.max(-0.35, Math.min(0.35, vx / 120)));
      ctx.font = `34px ${EMOJI_FONT}`;
      ctx.fillText(ship.glyph, 0, 0);
      ctx.restore();

      // floating +1 pops
      ctx.font = `bold 13px ${EMOJI_FONT}`;
      for (const p of s.pops) {
        ctx.globalAlpha = 1 - p.age / 0.7;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y - p.age * 42);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = 0;
      if (!shouldRun()) {
        running = false;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (running || !shouldRun()) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    draw(); // first frame is visible even before the loop starts / when motion is reduced
    const io = new IntersectionObserver(
      ([e]) => {
        s.visible = e.isIntersecting;
        kick();
      },
      { threshold: 0.1 }
    );
    io.observe(wrap);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);
    kick();
    kickRef.current = kick;

    return () => {
      kickRef.current = null;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pulse]);

  /* ── input ────────────────────────────────────────────────────────────── */
  const pointerTo = (e: React.PointerEvent) => {
    if (phaseRef.current !== "playing") return;
    const r = e.currentTarget.getBoundingClientRect();
    g.current.targetX = Math.max(16, Math.min(W - 16, ((e.clientX - r.left) / r.width) * W));
  };

  useEffect(() => {
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing" || typing(e.target)) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") g.current.keys.left = true;
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") g.current.keys.right = true;
      else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") g.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") g.current.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const hold = (dir: -1 | 1) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      if (phaseRef.current === "idle") start();
      g.current.dir = dir;
    },
    onPointerUp: () => (g.current.dir = 0),
    onPointerLeave: () => (g.current.dir = 0),
    onPointerCancel: () => (g.current.dir = 0),
  });

  const ship = SHIPS[shipIdx];

  return (
    <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto">
      {/* Atmosphere behind the window */}
      <div className="absolute -inset-5 bg-gradient-to-br from-purple-500/40 via-blue-500/25 to-cyan-400/25 dark:from-purple-600/35 dark:via-blue-600/25 dark:to-cyan-500/15 rounded-[2rem] blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/10 bg-[#0A1128] shadow-2xl shadow-purple-900/40 overflow-hidden">
        {/* Titlebar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.04] border-b border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <span className="ml-2 text-[11px] font-mono text-slate-400">star_catcher.py</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            running
          </span>
        </div>

        {/* Code */}
        <div className="px-4 pt-3 pb-2 font-mono text-[11.5px] leading-[1.35rem] text-slate-300 select-none">
          <div className="text-slate-500"># change a line, change the game</div>
          <div>
            <span className="text-sky-300">ship</span> = <span className="text-emerald-300">&quot;{ship.glyph}&quot;</span>
          </div>
          <div>
            <span className="text-sky-300">speed</span> = <span className="text-amber-300">{speed}</span>
          </div>
          <div className={`rounded px-1 -mx-1 transition-colors duration-300 ${flash === "score" ? "bg-amber-400/25" : ""}`}>
            <span className="text-sky-300">score</span> = <span className="text-amber-300">{score}</span>
          </div>
          <div className={`rounded px-1 -mx-1 transition-colors duration-300 ${flash === "lives" ? "bg-rose-400/25" : ""}`}>
            <span className="text-sky-300">lives</span> = <span className="text-amber-300">{lives}</span>
          </div>
        </div>

        {/* Tweak chips */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">ship</span>
            {SHIPS.map((s, i) => (
              <button
                key={s.glyph}
                type="button"
                aria-label={`Use ${s.glyph} as the ship`}
                aria-pressed={shipIdx === i}
                onClick={() => setShipIdx(i)}
                className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all active:scale-90 ${
                  shipIdx === i
                    ? "bg-purple-500/30 border-purple-300/60 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                {s.glyph}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">speed</span>
            {SPEEDS.map((v) => (
              <button
                key={v}
                type="button"
                aria-label={`Set speed to ${v}`}
                aria-pressed={speed === v}
                onClick={() => setSpeed(v)}
                className={`w-8 h-8 rounded-lg text-xs font-bold font-mono flex items-center justify-center border transition-all active:scale-90 ${
                  speed === v
                    ? "bg-blue-500/30 border-blue-300/60 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Game */}
        <div
          ref={wrapRef}
          className="relative border-t border-white/10 touch-pan-y cursor-crosshair"
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerMove={pointerTo}
          onPointerDown={pointerTo}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Star Catcher mini-game. Move the ship to catch stars and dodge comets."
            className="absolute inset-0 w-full h-full"
          />

          {/* HUD */}
          <div className="absolute top-2 left-3 right-3 flex items-center justify-between text-[12px] font-bold text-white drop-shadow pointer-events-none">
            <span>⭐ {score}</span>
            <span aria-label={`${lives} lives left`}>{"❤️".repeat(Math.max(0, lives)) || "💔"}</span>
          </div>

          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0A1030]/35">
              <button
                type="button"
                onClick={start}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-black shadow-lg shadow-purple-900/50 hover:scale-105 active:scale-95 transition-transform glow-pulse"
              >
                ▶ Play the game
              </button>
              <span className="text-[11px] text-slate-200/90 font-medium">
                Catch ⭐ · dodge ☄️ · drag, tap or use ← →
              </span>
            </div>
          )}
          {phase === "over" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#0A1030]/70 backdrop-blur-[2px] output-appear">
              <div className="text-2xl">🎉</div>
              <div className="text-white font-black text-base">You caught {score} ⭐</div>
              <div className="text-[11px] text-slate-300">Best this visit: {best}</div>
              <button
                type="button"
                onClick={start}
                className="mt-1 px-5 py-2 rounded-full bg-white text-purple-700 text-sm font-black hover:scale-105 active:scale-95 transition-transform"
              >
                Play again
              </button>
            </div>
          )}
        </div>

        {/* Touch / mouse controls */}
        <div className="grid grid-cols-2 gap-px bg-white/10 border-t border-white/10">
          <button
            type="button"
            aria-label="Move ship left"
            {...hold(-1)}
            className="py-2.5 bg-[#0A1128] text-slate-300 hover:bg-white/5 active:bg-purple-500/20 text-sm font-bold select-none touch-none"
          >
            ◀ Left
          </button>
          <button
            type="button"
            aria-label="Move ship right"
            {...hold(1)}
            className="py-2.5 bg-[#0A1128] text-slate-300 hover:bg-white/5 active:bg-purple-500/20 text-sm font-bold select-none touch-none"
          >
            Right ▶
          </button>
        </div>
      </div>
    </div>
  );
}
