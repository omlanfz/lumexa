"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  Hero "creation" visual: a tiny playable game next to the code that makes it.
  The ship and speed chips edit the code on screen AND change the game, so a
  child sees "I changed a line, the world changed".

  Built to work on phones as well as desktops:
  - The canvas is measured and drawn in real CSS pixels, so icons keep a readable
    size on every screen instead of shrinking with the card.
  - While playing, the play area takes over touch gestures (no accidental page
    scroll mid-drag); the rest of the time the page scrolls normally over it.
  - Steering works by dragging, by the big Left/Right buttons, and by keyboard.
  - It idles in an autopilot demo until someone presses Play.
*/

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

// U+FE0F forces the colour emoji glyph (some Android fonts draw ⭐ as a flat text symbol).
const STAR = "⭐️";
const COMET = "☄️";
const SHIPS = [
  { glyph: "🚀", tilt: -Math.PI / 4 },
  { glyph: "🛸", tilt: 0 },
  { glyph: "🦄", tilt: 0 },
];
const SPEEDS = [1, 2, 3];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const ASPECT = 0.66; // height / width of the play area

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/*
  Emoji are painted once into a small offscreen sprite and stamped with drawImage.
  Drawing colour-emoji *text* onto a canvas that is rotated and scaled every frame is
  unreliable on some phones (iOS Safari can render the glyph faint, blurry or missing),
  while images transform consistently everywhere and are cheaper to draw. If a device
  cannot paint a glyph into the sprite at all, we fall back to drawing it as text.
*/
const spriteCache = new Map<string, HTMLCanvasElement | null>();

function emojiSprite(glyph: string, size: number, dpr: number): HTMLCanvasElement | null {
  const key = `${glyph}|${size}|${dpr}`;
  if (spriteCache.has(key)) return spriteCache.get(key) ?? null;

  const px = Math.ceil(size * 1.5 * dpr); // padding so wide glyphs and tall flames never clip
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  let sprite: HTMLCanvasElement | null = null;
  if (c) {
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `${Math.round(size * dpr)}px ${EMOJI_FONT}`;
    c.fillText(glyph, px / 2, px / 2);
    try {
      const data = c.getImageData(0, 0, px, px).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          sprite = canvas;
          break;
        }
      }
    } catch {
      sprite = canvas; // pixels not readable (privacy mode): trust the sprite
    }
  }
  spriteCache.set(key, sprite);
  return sprite;
}

/** Draws `glyph` centred on the current origin, `size` CSS px tall. */
function drawEmoji(ctx: CanvasRenderingContext2D, glyph: string, size: number, dpr: number) {
  const sprite = emojiSprite(glyph, size, dpr);
  if (sprite) {
    const box = size * 1.5;
    ctx.drawImage(sprite, -box / 2, -box / 2, box, box);
    return;
  }
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.fillText(glyph, 0, 0);
}

// Static starfield in 0-1 space, generated once so SSR/CSR never disagree.
const STARFIELD = Array.from({ length: 46 }, (_, i) => ({
  x: ((i * 83.7) % 360) / 360,
  y: ((i * 47.3) % 232) / 232,
  r: 0.5 + ((i * 7) % 5) * 0.28,
  p: (i * 1.7) % 6.28,
  v: 0.03 + ((i * 11) % 7) * 0.012,
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
  const dim = useRef({ w: 340, h: 224 });
  const g = useRef({
    items: [] as Item[],
    pops: [] as Pop[],
    shipX: 170,
    targetX: 170,
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
    s.shipX = dim.current.w / 2;
    s.targetX = dim.current.w / 2;
    s.dir = 0;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    // Sizes scale a little with the card but never get small enough to be hard to see:
    // on a phone-width card they reach the same size as on desktop, which keeps the
    // stars and comets easy to spot against the sky.
    const sizes = () => {
      const { w } = dim.current;
      // Whole numbers keep the sprite cache small while the card is being resized.
      return {
        ship: Math.round(clamp(w * 0.15, 40, 46)),
        star: Math.round(clamp(w * 0.11, 30, 34)),
        rock: Math.round(clamp(w * 0.11, 32, 36)),
      };
    };
    const shipY = () => dim.current.h - sizes().ship * 1.2; // leaves room for the engine flame

    let raf = 0;
    let last = 0;
    let running = false;

    const shouldRun = () =>
      s.visible &&
      !document.hidden &&
      (phaseRef.current === "playing" || (phaseRef.current === "idle" && !s.reduced));

    const spawn = (playing: boolean) => {
      const { w, h } = dim.current;
      const rockChance = playing ? 0.2 + Math.min(0.15, s.t * 0.004) : 0.18; // gentle start, a bit harder over time
      s.items.push({
        x: 22 + Math.random() * (w - 44),
        y: -24,
        // fall speed is relative to the height so the game feels the same on every screen
        vy: h * (0.27 + 0.147 * speedRef.current) + Math.random() * h * 0.11,
        kind: Math.random() < rockChance ? "rock" : "star",
        spin: Math.random() * 6.28,
      });
    };

    const step = (dt: number) => {
      const { w, h } = dim.current;
      const sz = sizes();
      const sy = shipY();
      const playing = phaseRef.current === "playing";
      s.t += dt;
      s.shake = Math.max(0, s.shake - dt * 4);

      s.spawn -= dt;
      if (s.spawn <= 0) {
        spawn(playing);
        s.spawn = Math.max(0.3, 0.95 - 0.18 * speedRef.current - (playing ? s.t * 0.004 : 0));
      }

      if (playing) {
        const d = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0) || s.dir;
        if (d) s.targetX = clamp(s.targetX + d * w * 0.9 * dt, sz.ship * 0.5, w - sz.ship * 0.5);
      } else {
        // autopilot: chase the lowest star, otherwise sway
        let pick: Item | null = null;
        for (const it of s.items) {
          if (it.kind === "star" && it.y < sy - 10 && (!pick || it.y > pick.y)) pick = it;
        }
        s.targetX = pick ? pick.x : w / 2 + Math.sin(s.t * 0.8) * w * 0.26;
      }
      s.shipX += (s.targetX - s.shipX) * Math.min(1, dt * (playing ? 14 : 5));

      for (const it of s.items) {
        it.y += it.vy * dt;
        it.spin += dt * 3;
      }
      const reach = sz.ship * 0.5 + sz.star * 0.3;
      for (let i = s.items.length - 1; i >= 0; i--) {
        const it = s.items[i];
        const hit = Math.abs(it.x - s.shipX) < reach && Math.abs(it.y - sy) < reach;
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
        } else if (it.y > h + 28) {
          s.items.splice(i, 1);
        }
      }
      for (const p of s.pops) p.age += dt;
      s.pops = s.pops.filter((p) => p.age < 0.7);
    };

    const draw = () => {
      const { w, h } = dim.current;
      const sz = sizes();
      const sy = shipY();
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 6 * s.shake, (Math.random() - 0.5) * 6 * s.shake);

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0A1030");
      sky.addColorStop(0.6, "#1E1565");
      sky.addColorStop(1, "#33207F");
      ctx.fillStyle = sky;
      ctx.fillRect(-8, -8, w + 16, h + 16);
      const neb = ctx.createRadialGradient(w * 0.78, h * 0.28, 4, w * 0.78, h * 0.28, w * 0.34);
      neb.addColorStop(0, "rgba(96,165,250,0.35)");
      neb.addColorStop(1, "rgba(96,165,250,0)");
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);
      const neb2 = ctx.createRadialGradient(w * 0.18, h * 0.7, 4, w * 0.18, h * 0.7, w * 0.3);
      neb2.addColorStop(0, "rgba(168,85,247,0.32)");
      neb2.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, w, h);

      for (const st of STARFIELD) {
        const y = (st.y * h + s.t * st.v * h) % h;
        const a = 0.35 + 0.35 * Math.sin(s.t * 2 + st.p);
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(st.x * w, y, st.r, 0, 6.283);
        ctx.fill();
      }

      const hz = ctx.createLinearGradient(0, h - 26, 0, h);
      hz.addColorStop(0, "rgba(124,58,237,0)");
      hz.addColorStop(1, "rgba(124,58,237,0.45)");
      ctx.fillStyle = hz;
      ctx.fillRect(0, h - 26, w, 26);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const it of s.items) {
        ctx.save();
        ctx.translate(it.x, it.y);
        if (it.kind === "star") {
          // Soft halo drawn as a gradient (much cheaper than shadowBlur on phones). The
          // centre stays clear so the yellow star never washes out against a yellow glow.
          const gl = ctx.createRadialGradient(0, 0, sz.star * 0.2, 0, 0, sz.star * 0.95);
          gl.addColorStop(0, "rgba(253,224,71,0)");
          gl.addColorStop(0.5, "rgba(253,224,71,0.22)");
          gl.addColorStop(1, "rgba(253,224,71,0)");
          ctx.fillStyle = gl;
          ctx.fillRect(-sz.star, -sz.star, sz.star * 2, sz.star * 2);
          const k = 1 + Math.sin(it.spin) * 0.1;
          ctx.scale(k, k);
          drawEmoji(ctx, STAR, sz.star, dpr);
        } else {
          ctx.rotate(Math.sin(it.spin) * 0.3);
          drawEmoji(ctx, COMET, sz.rock, dpr);
        }
        ctx.restore();
      }

      const ship = shipRef.current;
      const vx = s.targetX - s.shipX;
      ctx.save();
      ctx.translate(s.shipX, sy);
      const fl = sz.ship * 0.55;
      const flame = ctx.createRadialGradient(0, sz.ship * 0.6, 1, 0, sz.ship * 0.6, fl);
      flame.addColorStop(0, "rgba(251,191,36,0.55)");
      flame.addColorStop(1, "rgba(251,146,60,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(0, sz.ship * 0.6, fl * 0.6, fl + Math.sin(s.t * 30) * 2, 0, 0, 6.283);
      ctx.fill();
      ctx.rotate(ship.tilt + clamp(vx / (w * 0.35), -0.35, 0.35));
      drawEmoji(ctx, ship.glyph, sz.ship, dpr);
      ctx.restore();

      ctx.font = `bold ${clamp(w * 0.04, 13, 16)}px ${EMOJI_FONT}`;
      for (const p of s.pops) {
        ctx.globalAlpha = 1 - p.age / 0.7;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y - p.age * 42);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // Keep the bitmap in step with the on-screen size (rotation, resize, browser bars).
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(200, Math.round(r.width));
      const h = Math.max(130, Math.round(r.height));
      const o = dim.current;
      if (w === o.w && h === o.h && canvas.width === Math.round(w * dpr)) return;
      const fx = w / o.w;
      const fy = h / o.h;
      s.shipX *= fx;
      s.targetX *= fx;
      for (const it of s.items) {
        it.x *= fx;
        it.y *= fy;
      }
      dim.current = { w, h };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
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

    resize();
    s.shipX = dim.current.w / 2;
    s.targetX = dim.current.w / 2;
    draw(); // first frame is visible even before the loop starts / when motion is reduced
    const ro = new ResizeObserver(() => {
      resize();
      kick();
    });
    ro.observe(wrap);
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
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pulse]);

  /* ── input ────────────────────────────────────────────────────────────── */
  const steer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    const r = e.currentTarget.getBoundingClientRect();
    const { w } = dim.current;
    g.current.targetX = clamp(e.clientX - r.left, 20, w - 20);
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
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      if (phaseRef.current !== "playing") start();
      g.current.dir = dir;
    },
    onPointerUp: () => (g.current.dir = 0),
    onPointerCancel: () => (g.current.dir = 0),
    onLostPointerCapture: () => (g.current.dir = 0),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const ship = SHIPS[shipIdx];
  const noSelect = "select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]";

  return (
    <div className="relative w-full max-w-[460px] mx-auto lg:mx-0 lg:ml-auto">
      {/* Atmosphere behind the window */}
      <div className="absolute -inset-5 bg-gradient-to-br from-purple-500/40 via-blue-500/25 to-cyan-400/25 dark:from-purple-600/35 dark:via-blue-600/25 dark:to-cyan-500/15 rounded-[2rem] blur-2xl pointer-events-none" />

      <div className={`relative rounded-2xl border border-white/10 bg-[#0A1128] shadow-2xl shadow-purple-900/40 overflow-hidden ${noSelect}`}>
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
        <div className="px-4 pt-3 pb-2 font-mono text-[12px] sm:text-[11.5px] leading-[1.45rem] text-slate-300">
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

        {/* Tweak chips (44px touch targets) */}
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
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all active:scale-90 ${
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
                className={`w-10 h-10 rounded-xl text-sm font-bold font-mono flex items-center justify-center border transition-all active:scale-90 ${
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

        {/* Game: takes over touch gestures only while a round is being played */}
        <div
          ref={wrapRef}
          className="relative border-t border-white/10 cursor-crosshair"
          style={{ aspectRatio: `1 / ${ASPECT}`, touchAction: phase === "playing" ? "none" : "pan-y" }}
          onPointerDown={(e) => {
            if (phaseRef.current === "playing") {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              steer(e);
            }
          }}
          onPointerMove={steer}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Star Catcher mini-game. Move the ship to catch stars and dodge comets."
            className="absolute inset-0 w-full h-full"
          />

          {/* HUD */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-sm font-bold text-white pointer-events-none">
            <span className="rounded-full bg-[#0A1030]/70 px-2.5 py-0.5 leading-6 tabular-nums">
              {STAR} {score}
            </span>
            <span className="rounded-full bg-[#0A1030]/70 px-2.5 py-0.5 leading-6" aria-label={`${lives} lives left`}>
              {"❤️".repeat(Math.max(0, lives)) || "💔"}
            </span>
          </div>

          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0A1030]/35 px-3 text-center">
              <button
                type="button"
                onClick={start}
                className="px-7 py-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-base font-black shadow-lg shadow-purple-900/50 hover:scale-105 active:scale-95 transition-transform glow-pulse"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 inline -mt-0.5 mr-1.5" fill="currentColor" aria-hidden>
                  <path d="M8 4.5v15l11-7.5z" />
                </svg>
                Play the game
              </button>
              <span className="text-xs text-slate-100 font-medium leading-snug">
                Catch {STAR} and dodge {COMET}
                <br />
                Drag the screen or use the buttons below
              </span>
            </div>
          )}
          {phase === "over" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#0A1030]/75 backdrop-blur-[2px] output-appear">
              <div className="text-3xl">🎉</div>
              <div className="text-white font-black text-lg">
                You caught {score} {STAR}
              </div>
              <div className="text-xs text-slate-300">Best this visit: {best}</div>
              <button
                type="button"
                onClick={start}
                className="mt-1 px-6 py-2.5 rounded-full bg-white text-purple-700 text-sm font-black hover:scale-105 active:scale-95 transition-transform"
              >
                Play again
              </button>
            </div>
          )}
        </div>

        {/* Steering buttons: hold to move */}
        <div className="grid grid-cols-2 gap-px bg-white/10 border-t border-white/10">
          <button
            type="button"
            aria-label="Move ship left"
            {...hold(-1)}
            className="py-4 bg-[#0A1128] text-slate-200 hover:bg-white/5 active:bg-purple-500/30 text-base font-bold touch-none"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 inline -mt-0.5 mr-1.5" fill="currentColor" aria-hidden>
              <path d="M16 4.5v15L6.5 12z" />
            </svg>
            Left
          </button>
          <button
            type="button"
            aria-label="Move ship right"
            {...hold(1)}
            className="py-4 bg-[#0A1128] text-slate-200 hover:bg-white/5 active:bg-purple-500/30 text-base font-bold touch-none"
          >
            Right
            <svg viewBox="0 0 24 24" className="w-5 h-5 inline -mt-0.5 ml-1.5" fill="currentColor" aria-hidden>
              <path d="M8 4.5v15l9.5-7.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
