"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoProps } from "../types";
import { Burst, EMOJI_FONT, TouchPad, toLocal, useCanvas } from "../ui";

/* ───────────────────────── Galactic Shooter (Roblox · Lua) ───────────────────────── */

export const SHOOTER_CODE = [
  "local score = 0",
  "local laserSpeed = 60",
  "",
  "local function fireLaser(ship)",
  '  local laser = Instance.new("Part")',
  "  laser.Velocity = Vector3.new(0, laserSpeed, 0)",
  "  laser.Parent = workspace",
  "end",
  "",
  "enemy.Touched:Connect(function(hit)",
  '  if hit.Name == "Laser" then',
  "    score += 10",
  "    enemy:Destroy()",
  "  end",
  "end)",
];

const SW = 340;
const SH = 300;

interface Foe { x: number; y: number; vy: number; ph: number }

export function ShooterOutput({ flash }: DemoProps) {
  const g = useRef({
    shipX: SW / 2,
    target: SW / 2,
    dir: 0,
    left: false,
    right: false,
    lasers: [] as { x: number; y: number }[],
    foes: [] as Foe[],
    booms: [] as { x: number; y: number; age: number }[],
    fire: 0.1,
    spawn: 0.3,
    t: 0,
    shots: 0,
    score: 0,
    lives: 3,
    over: false,
    seed: 3,
  });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [confetti, setConfetti] = useState(0);

  const rnd = () => {
    const s = g.current;
    s.seed = (s.seed * 16807) % 2147483647;
    return s.seed / 2147483647;
  };

  const restart = () => {
    const s = g.current;
    s.lasers = [];
    s.foes = [];
    s.booms = [];
    s.score = 0;
    s.lives = 3;
    s.t = 0;
    s.over = false;
    setScore(0);
    setLives(3);
    setOver(false);
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") g.current.left = true;
      else if (k === "arrowright" || k === "d") g.current.right = true;
      else return;
      e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") g.current.left = false;
      if (k === "arrowright" || k === "d") g.current.right = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  const ref = useCanvas(SW, SH, (ctx, dt) => {
    const s = g.current;
    if (!s.over) {
      s.t += dt;
      const d = (s.right ? 1 : 0) - (s.left ? 1 : 0) || s.dir;
      if (d) s.target = Math.max(18, Math.min(SW - 18, s.target + d * 300 * dt));
      s.shipX += (s.target - s.shipX) * Math.min(1, dt * 14);

      s.fire -= dt;
      if (s.fire <= 0) {
        s.lasers.push({ x: s.shipX, y: SH - 52 });
        s.fire = 0.26;
        s.shots++;
        if (s.shots % 6 === 1) flash(4);
      }
      s.lasers = s.lasers.map((l) => ({ ...l, y: l.y - 440 * dt })).filter((l) => l.y > -12);

      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.foes.push({ x: 22 + rnd() * (SW - 44), y: -20, vy: 32 + Math.min(40, s.t * 1.4), ph: rnd() * 6 });
        s.spawn = Math.max(0.38, 0.95 - s.t * 0.012);
      }
      s.foes = s.foes.map((f) => ({ ...f, y: f.y + f.vy * dt, x: f.x + Math.sin(s.t * 2 + f.ph) * 22 * dt }));
      for (let i = s.foes.length - 1; i >= 0; i--) {
        const f = s.foes[i];
        const li = s.lasers.findIndex((l) => Math.abs(l.x - f.x) < 18 && Math.abs(l.y - f.y) < 18);
        if (li >= 0) {
          s.lasers.splice(li, 1);
          s.foes.splice(i, 1);
          s.booms.push({ x: f.x, y: f.y, age: 0 });
          s.score += 10;
          setScore(s.score);
          flash(11);
        } else if (f.y > SH - 30) {
          s.foes.splice(i, 1);
          s.lives -= 1;
          setLives(s.lives);
          if (s.lives <= 0) {
            s.over = true;
            setOver(true);
            setConfetti((c) => c + 1);
          }
        }
      }
      s.booms = s.booms.map((b) => ({ ...b, age: b.age + dt })).filter((b) => b.age < 0.45);
    }

    // draw
    const sky = ctx.createLinearGradient(0, 0, 0, SH);
    sky.addColorStop(0, "#050A26");
    sky.addColorStop(1, "#2A1B6B");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SW, SH);
    for (let i = 0; i < 40; i++) {
      const y = ((i * 53) % SH + s.t * (8 + (i % 5) * 4)) % SH;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 4) * 0.15})`;
      ctx.fillRect((i * 79) % SW, y, 1.5, 1.5);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const l of s.lasers) {
      const lg = ctx.createLinearGradient(0, l.y, 0, l.y + 18);
      lg.addColorStop(0, "#67E8F9");
      lg.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(l.x - 2, l.y, 4, 18);
    }
    ctx.font = `26px ${EMOJI_FONT}`;
    for (const f of s.foes) ctx.fillText("👾", f.x, f.y);
    for (const b of s.booms) {
      ctx.globalAlpha = 1 - b.age / 0.45;
      ctx.font = `${22 + b.age * 50}px ${EMOJI_FONT}`;
      ctx.fillText("💥", b.x, b.y);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(s.shipX, SH - 32);
    ctx.rotate(-Math.PI / 4);
    ctx.font = `34px ${EMOJI_FONT}`;
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
  });

  const board = [
    { name: "NovaStar", pts: 180 },
    { name: "KaiBlaster", pts: 120 },
    { name: "You", pts: score },
  ].sort((a, b) => b.pts - a.pts);

  return (
    <div className="relative select-none">
      <div
        className="relative rounded-2xl overflow-hidden border border-slate-700 touch-pan-y cursor-crosshair"
        style={{ aspectRatio: `${SW} / ${SH}` }}
        onPointerMove={(e) => (g.current.target = Math.max(18, Math.min(SW - 18, toLocal(e, SW, SH).x)))}
        onPointerDown={(e) => (g.current.target = Math.max(18, Math.min(SW - 18, toLocal(e, SW, SH).x)))}
      >
        <canvas ref={ref} className="absolute inset-0 w-full h-full" role="img" aria-label="Galactic Shooter game" />
        <div className="absolute top-2 left-3 text-white text-xs font-black drop-shadow">
          SCORE {score} <span className="ml-2">{"❤️".repeat(Math.max(0, lives)) || "💔"}</span>
        </div>
        <div className="absolute top-2 right-2 w-[104px] rounded-lg bg-black/45 border border-white/15 px-2 py-1.5 text-[10px] text-slate-100 leading-4">
          <div className="font-black text-indigo-200 tracking-wider">🏆 TOP</div>
          {board.map((r) => (
            <div key={r.name} className={`flex justify-between ${r.name === "You" ? "text-amber-300 font-black" : ""}`}>
              <span>{r.name}</span>
              <span>{r.pts}</span>
            </div>
          ))}
        </div>
        {over && (
          <div className="absolute inset-0 bg-[#050A26]/75 flex flex-col items-center justify-center gap-1.5 demo-pop">
            <div className="text-white font-black text-lg">Mission over! 🎉</div>
            <div className="text-slate-200 text-sm">You scored {score} points</div>
            <button
              type="button"
              onClick={restart}
              className="mt-1 px-5 py-2 rounded-full bg-white text-purple-700 text-sm font-black hover:scale-105 active:scale-95 transition-transform"
            >
              Play again
            </button>
          </div>
        )}
        <Burst n={confetti} emojis={["⭐", "✨", "🚀"]} />
      </div>
      <TouchPad onDir={(d) => (g.current.dir = d)} />
    </div>
  );
}

/* ───────────────────────── Python Arcade Game (Python · Pygame) ───────────────────────── */

export const ARCADE_CODE = [
  "GRAVITY = 0.8",
  "JUMP_POWER = 14",
  "",
  "if keys[K_SPACE] and on_ground:",
  "    vy = -JUMP_POWER",
  "vy += GRAVITY",
  "player.y += vy",
  "",
  "for enemy in enemies:",
  "    if player.colliderect(enemy):",
  "        game_over = True",
  "for coin in coins:",
  "    if player.colliderect(coin):",
  "        score += 5",
  "high_score = max(high_score, score)",
];

const AW = 340;
const AH = 220;
const GY = 176; // ground line

export function ArcadeOutput({ flash }: DemoProps) {
  const g = useRef({
    y: GY - 26,
    vy: 0,
    obs: [] as { x: number; kind: "🌵" | "👾" }[],
    coins: [] as { x: number; y: number }[],
    t: 0,
    spawn: 0.8,
    coinSpawn: 1.2,
    over: false,
    coinCount: 0,
    shown: 0,
    seed: 11,
    jumpQueued: false,
  });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);

  const rnd = () => {
    const s = g.current;
    s.seed = (s.seed * 16807) % 2147483647;
    return s.seed / 2147483647;
  };

  const restart = () => {
    const s = g.current;
    s.y = GY - 26;
    s.vy = 0;
    s.obs = [];
    s.coins = [];
    s.t = 0;
    s.spawn = 0.8;
    s.coinSpawn = 1.2;
    s.over = false;
    s.coinCount = 0;
    s.shown = 0;
    setScore(0);
    setOver(false);
  };

  const jump = () => {
    if (g.current.over) restart();
    else g.current.jumpQueued = true;
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (g.current.over) restart();
        else g.current.jumpQueued = true;
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  const ref = useCanvas(AW, AH, (ctx, dt) => {
    const s = g.current;
    const onGround = s.y >= GY - 26 - 0.5;
    if (!s.over) {
      s.t += dt;
      const speed = Math.min(300, 150 + s.t * 7);
      if (s.jumpQueued && onGround) {
        s.vy = -470;
        flash(4);
      }
      s.jumpQueued = false;
      s.vy += 1500 * dt;
      s.y = Math.min(GY - 26, s.y + s.vy * dt);
      if (s.y >= GY - 26) s.vy = 0;

      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.obs.push({ x: AW + 20, kind: rnd() < 0.5 ? "🌵" : "👾" });
        s.spawn = 1.15 + rnd() * 0.9;
      }
      s.coinSpawn -= dt;
      if (s.coinSpawn <= 0) {
        s.coins.push({ x: AW + 20, y: GY - 62 - rnd() * 40 });
        s.coinSpawn = 1.5 + rnd() * 1.2;
      }
      s.obs = s.obs.map((o) => ({ ...o, x: o.x - speed * dt })).filter((o) => o.x > -30);
      s.coins = s.coins.map((c) => ({ ...c, x: c.x - speed * dt })).filter((c) => c.x > -30);

      const fx = 56;
      for (const o of s.obs) {
        if (Math.abs(o.x - fx) < 20 && s.y > GY - 26 - 24) {
          s.over = true;
          flash(10);
          setOver(true);
          const final = Math.floor(s.t * 4) + s.coinCount * 5;
          setBest((b) => Math.max(b, final));
          setTimeout(() => flash(14), 450);
        }
      }
      for (let i = s.coins.length - 1; i >= 0; i--) {
        const c = s.coins[i];
        if (Math.abs(c.x - fx) < 22 && Math.abs(c.y - (s.y + 6)) < 24) {
          s.coins.splice(i, 1);
          s.coinCount += 1;
          flash(13);
        }
      }
      const sc = Math.floor(s.t * 4) + s.coinCount * 5;
      if (sc !== s.shown) {
        s.shown = sc;
        setScore(sc);
      }
    }

    // draw
    const sky = ctx.createLinearGradient(0, 0, 0, AH);
    sky.addColorStop(0, "#5AA9FF");
    sky.addColorStop(1, "#FFE3B3");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, AW, AH);
    ctx.fillStyle = "#FFF2A8";
    ctx.beginPath();
    ctx.arc(268, 40, 20, 0, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.95)";
    for (let i = 0; i < 3; i++) {
      const span = AW + 120;
      const cx = ((((i * 140 - s.t * 18) % span) + span) % span) - 60;
      ctx.fillRect(cx, 30 + i * 22, 44, 12);
      ctx.fillRect(cx + 10, 22 + i * 22, 24, 10);
    }
    ctx.fillStyle = "#4FA37A";
    ctx.beginPath();
    ctx.moveTo(0, GY);
    for (let x = 0; x <= AW; x += 8) ctx.lineTo(x, GY - 28 - Math.abs(Math.sin(x / 60 + 1)) * 26);
    ctx.lineTo(AW, GY);
    ctx.fill();
    ctx.fillStyle = "#58B848";
    ctx.fillRect(0, GY, AW, 8);
    ctx.fillStyle = "#8A5A34";
    ctx.fillRect(0, GY + 8, AW, AH - GY);
    ctx.fillStyle = "#7A4D2B";
    for (let i = 0; i < 22; i++) ctx.fillRect(((i * 16 - s.t * 120) % (AW + 16) + AW + 16) % (AW + 16) - 8, GY + 14 + (i % 3) * 10, 8, 5);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `20px ${EMOJI_FONT}`;
    for (const c of s.coins) ctx.fillText("🪙", c.x, c.y + Math.sin(s.t * 6 + c.x) * 2);
    ctx.font = `28px ${EMOJI_FONT}`;
    for (const o of s.obs) ctx.fillText(o.kind, o.x, GY - 14);
    ctx.font = `34px ${EMOJI_FONT}`;
    ctx.fillText("🦊", 56, s.y + 2);
  });

  return (
    <div className="select-none">
      <div
        className="relative rounded-2xl overflow-hidden border border-sky-200 dark:border-slate-700 cursor-pointer touch-manipulation"
        style={{ aspectRatio: `${AW} / ${AH}` }}
        onPointerDown={jump}
        role="button"
        tabIndex={0}
        aria-label="Tap to jump"
      >
        <canvas ref={ref} className="absolute inset-0 w-full h-full" />
        <div className="absolute top-2 left-3 font-mono text-[11px] font-black text-white [text-shadow:2px_2px_0_#000]">
          SCORE {String(score).padStart(4, "0")}
        </div>
        <div className="absolute top-2 right-3 font-mono text-[11px] font-black text-white [text-shadow:2px_2px_0_#000]">
          HI {String(best).padStart(4, "0")}
        </div>
        {over && (
          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1 demo-pop">
            <div className="font-mono text-white font-black text-lg [text-shadow:2px_2px_0_#000]">GAME OVER</div>
            <div className="text-white/90 text-xs">Tap to try again</div>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Tap the game (or press Space) to jump · collect 🪙 · avoid 🌵 and 👾
      </p>
    </div>
  );
}

/* ───────────────────────── RPG Quest World (Unity · C#) ───────────────────────── */

export const RPG_CODE = [
  "void OnTriggerEnter(Collider other)",
  "{",
  '    if (other.CompareTag("NPC"))',
  '        quest.Start("Find 3 gems");',
  "",
  '    if (other.CompareTag("Gem"))',
  "    {",
  "        gems++;",
  "        Destroy(other.gameObject);",
  "    }",
  "",
  "    if (gems >= 3)",
  "        quest.Complete();",
  "}",
];

const COLS = 8;
const ROWS = 6;
const CELL = 40;
const TREES = ["0,0", "7,0", "3,1", "3,2", "5,3", "6,5", "0,4", "4,5"];
const NPC = { x: 6, y: 1 };
const CHEST = { x: 7, y: 5 };
const ALL_GEMS = ["1,1", "2,5", "5,4"];

export function RpgOutput({ flash }: DemoProps) {
  const [hero, setHero] = useState({ x: 1, y: 3 });
  const [gems, setGems] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const [say, setSay] = useState("Walk into 👵 to talk. Use the arrows below, WASD, or the arrow keys.");
  const [burst, setBurst] = useState(0);

  const move = (dx: number, dy: number) => {
    const nx = hero.x + dx;
    const ny = hero.y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || TREES.includes(`${nx},${ny}`)) return;
    if (nx === NPC.x && ny === NPC.y) {
      if (!started) {
        setStarted(true);
        setSay("👵 “Three gems fell in the forest. Please find them!”");
        flash(3);
      } else if (done) {
        setSay("👵 “You are a hero! Open the chest 🎁.”");
      } else if (gems.length >= 3) {
        setDone(true);
        setSay("👵 “You found them all! Quest complete! +50 XP”");
        setBurst((b) => b + 1);
        flash(12);
      } else {
        setSay(`👵 “Keep looking! ${gems.length} of 3 gems found.”`);
      }
      return;
    }
    if (nx === CHEST.x && ny === CHEST.y) {
      if (done && !chestOpen) {
        setChestOpen(true);
        setBurst((b) => b + 1);
        setSay("🏆 You opened the chest and found a golden crown!");
      } else if (!done) {
        setSay("🔒 The chest is locked. Finish the quest first.");
      }
      return;
    }
    setHero({ x: nx, y: ny });
    const key = `${nx},${ny}`;
    if (ALL_GEMS.includes(key) && !gems.includes(key)) {
      const next = [...gems, key];
      setGems(next);
      flash(7);
      setTimeout(() => flash(8), 250);
      if (next.length >= 3) {
        setSay("💎 That is all 3 gems! Take them back to 👵.");
        setTimeout(() => flash(11), 500);
      } else {
        setSay(`💎 Gem found! ${next.length} of 3.`);
      }
    }
  };

  const act = useRef(move);
  useEffect(() => {
    act.current = move;
  });
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const d: Record<string, [number, number]> = {
        arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
        arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
      };
      if (!d[k]) return;
      e.preventDefault();
      act.current(d[k][0], d[k][1]);
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  const xp = (gems.length * 10) + (done ? 50 : 0);
  const pad = "w-12 h-11 rounded-xl bg-slate-900/85 hover:bg-slate-800 active:bg-purple-700 text-white font-bold select-none transition-colors";

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2 text-xs font-bold">
        <span className="text-slate-700 dark:text-slate-200">
          {started ? (done ? "✅ Quest complete" : `🗺️ Find 3 gems · ${gems.length}/3`) : "🗺️ Talk to the Elder"}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300">⚡ {xp} XP</span>
      </div>
      <div
        className="relative mx-auto rounded-2xl overflow-hidden border-2 border-emerald-700/40 shadow-md"
        style={{ width: COLS * CELL, maxWidth: "100%", aspectRatio: `${COLS} / ${ROWS}` }}
      >
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
          {Array.from({ length: COLS * ROWS }).map((_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            const key = `${x},${y}`;
            return (
              <div key={key} className={`flex items-center justify-center text-[22px] leading-none ${(x + y) % 2 ? "bg-[#62C061]" : "bg-[#5BB85A]"}`}>
                {TREES.includes(key) ? "🌲" : ALL_GEMS.includes(key) && !gems.includes(key) ? <span className="demo-float">💎</span> : ""}
              </div>
            );
          })}
        </div>
        <div className="absolute flex items-center justify-center text-[24px]" style={{ left: `${(NPC.x / COLS) * 100}%`, top: `${(NPC.y / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }}>
          👵{started && !done && <span className="absolute -top-1 right-1 text-xs font-black text-amber-300">!</span>}
          {!started && <span className="absolute -top-1 right-1 text-xs font-black text-amber-300 demo-float">!</span>}
        </div>
        <div className="absolute flex items-center justify-center text-[24px]" style={{ left: `${(CHEST.x / COLS) * 100}%`, top: `${(CHEST.y / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }}>
          {chestOpen ? "👑" : "🎁"}
        </div>
        <div
          className="absolute flex items-center justify-center text-[26px] transition-transform duration-150 ease-out drop-shadow"
          style={{ width: `${100 / COLS}%`, height: `${100 / ROWS}%`, left: 0, top: 0, transform: `translate(${hero.x * 100}%, ${hero.y * 100}%)` }}
        >
          🧝
        </div>
        <Burst n={burst} emojis={["💎", "✨", "🎉"]} />
      </div>
      <p className="mt-2 min-h-[2.5rem] text-center text-xs text-slate-600 dark:text-slate-300 leading-snug demo-rise" key={say}>{say}</p>
      <div className="mt-1 flex flex-col items-center gap-1.5">
        <button type="button" className={pad} aria-label="Move up" onClick={() => move(0, -1)}>▲</button>
        <div className="flex gap-1.5">
          <button type="button" className={pad} aria-label="Move left" onClick={() => move(-1, 0)}>◀︎</button>
          <button type="button" className={pad} aria-label="Move down" onClick={() => move(0, 1)}>▼</button>
          <button type="button" className={pad} aria-label="Move right" onClick={() => move(1, 0)}>▶︎</button>
        </div>
      </div>
    </div>
  );
}
