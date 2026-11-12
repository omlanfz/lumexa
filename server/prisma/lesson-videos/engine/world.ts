// The shared look of every Little Coders preview video: a calm space backdrop, the Lumexa mark,
// the lesson header, Pixel the robot host, panels and the subtitle bar.

import {
  H,
  W,
  ease,
  clamp01,
  fillRR,
  fontOf,
  glow,
  hexA,
  linear,
  rng,
  rrPath,
  sparkle,
  strokeRR,
  text,
  wrap,
  type Ctx,
} from './kit';
import type { PlanCue, VideoPlan } from './plan';

// ─── Background ─────────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  drift: number;
}

let starCache: { seed: number; stars: Star[] } | null = null;

function starsFor(seed: number): Star[] {
  if (starCache?.seed === seed) return starCache.stars;
  const r = rng(seed * 7919 + 13);
  const stars: Star[] = Array.from({ length: 150 }, () => ({
    x: r() * W,
    y: r() * H,
    r: 0.8 + r() * 2.1,
    phase: r() * Math.PI * 2,
    speed: 0.6 + r() * 1.6,
    drift: 2 + r() * 9,
  }));
  starCache = { seed, stars };
  return stars;
}

export function drawBackground(c: Ctx, t: number, plan: VideoPlan): void {
  c.fillStyle = linear(c, 0, 0, W * 0.3, H, [
    [0, '#0C0A2E'],
    [0.55, '#1A1566'],
    [1, '#2A1E84'],
  ]);
  c.fillRect(0, 0, W, H);
  // slow nebula glows in the course colours
  glow(c, 280 + Math.sin(t * 0.18) * 60, 880, 560, plan.accent[0], 0.22);
  glow(c, 1650 + Math.cos(t * 0.15) * 70, 260, 520, plan.accent[1], 0.16);
  glow(c, 960, 40, 700, '#6D5BFF', 0.12);
  for (const s of starsFor(plan.seed)) {
    const x = (((s.x - t * s.drift) % W) + W) % W;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * s.speed + s.phase));
    c.fillStyle = `rgba(255,255,255,${(a * 0.85).toFixed(3)})`;
    c.beginPath();
    c.arc(x, s.y, s.r, 0, Math.PI * 2);
    c.fill();
  }
}

// ─── Header (logo + lesson) ─────────────────────────────────────────────────

export function drawHeader(c: Ctx, plan: VideoPlan, logo: HTMLImageElement | null, alpha = 1): void {
  c.save();
  c.globalAlpha *= alpha;
  if (logo) {
    c.save();
    rrPath(c, 56, 34, 84, 84, 22);
    c.clip();
    c.drawImage(logo, 56, 34, 84, 84);
    c.restore();
    strokeRR(c, 56, 34, 84, 84, 22, 'rgba(255,255,255,.28)', 2);
  }
  text(c, 'LUMEXA', 160, 70, { size: 34, weight: 900, color: '#fff' });
  text(c, 'LITTLE CODERS', 160, 104, { size: 22, weight: 800, color: hexA('#ffffff', 0.7) });

  const label = `LESSON ${plan.lesson.number} OF ${plan.course.lessons}  ·  ${plan.course.title.toUpperCase()}`;
  c.font = fontOf(24, 800);
  const w = c.measureText(label).width + 56;
  const x = W - 60 - w;
  fillRR(c, x, 52, w, 52, 26, linear(c, x, 0, x + w, 0, [[0, plan.accent[0]], [1, plan.accent[1]]]));
  text(c, label, x + w / 2, 79, { size: 24, weight: 800, align: 'center', base: 'middle', color: '#fff' });
  c.restore();
}

// ─── Panels and chips ───────────────────────────────────────────────────────

export function panel(c: Ctx, x: number, y: number, w: number, h: number, o: { fill?: string; border?: string; r?: number } = {}): void {
  fillRR(c, x, y, w, h, o.r ?? 30, o.fill ?? 'rgba(10,8,44,.55)');
  strokeRR(c, x, y, w, h, o.r ?? 30, o.border ?? 'rgba(255,255,255,.16)', 2);
}

export function chip(c: Ctx, label: string, x: number, y: number, o: { size?: number; fill?: string | CanvasGradient; color?: string; padX?: number; h?: number; align?: 'left' | 'center' } = {}): number {
  const size = o.size ?? 28;
  c.font = fontOf(size, 800);
  const padX = o.padX ?? 26;
  const w = c.measureText(label).width + padX * 2;
  const h = o.h ?? size + 26;
  const x0 = o.align === 'center' ? x - w / 2 : x;
  fillRR(c, x0, y, w, h, h / 2, o.fill ?? 'rgba(255,255,255,.16)');
  text(c, label, x0 + w / 2, y + h / 2 + 1, { size, weight: 800, align: 'center', base: 'middle', color: o.color ?? '#fff' });
  return w;
}

// ─── Pixel, the robot host ──────────────────────────────────────────────────

export type PixelMood = 'wave' | 'point' | 'cheer' | 'idle' | 'think';

/** Draws Pixel standing with its feet at (x, y); `s` is the scale (1 ≈ 380 px tall). */
export function drawPixel(c: Ctx, x: number, y: number, s: number, t: number, mood: PixelMood, alpha = 1): void {
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y + Math.sin(t * 2.2) * 7 * s);
  c.scale(s, s);

  // shadow + thruster
  c.fillStyle = 'rgba(0,0,0,.25)';
  c.beginPath();
  c.ellipse(0, 34, 70 - Math.sin(t * 2.2) * 4, 12, 0, 0, Math.PI * 2);
  c.fill();
  const flame = 30 + Math.sin(t * 18) * 6;
  const fg = linear(c, 0, -34, 0, -34 + flame, [[0, '#FFE066'], [1, 'rgba(255,120,60,0)']]);
  c.fillStyle = fg;
  c.beginPath();
  c.moveTo(-20, -40);
  c.lineTo(20, -40);
  c.lineTo(0, -34 + flame + 20);
  c.closePath();
  c.fill();

  // arms (behind the body)
  const arm = (sx: number, ang: number, len: number) => {
    const hx = sx + Math.cos(ang) * len;
    const hy = -130 + Math.sin(ang) * len;
    c.strokeStyle = '#2563EB';
    c.lineWidth = 20;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sx, -130);
    c.lineTo(hx, hy);
    c.stroke();
    c.fillStyle = '#BAE6FD';
    c.beginPath();
    c.arc(hx, hy, 17, 0, Math.PI * 2);
    c.fill();
  };
  arm(-52, Math.PI * 0.62, 86);
  if (mood === 'wave') arm(52, -Math.PI * 0.32 + Math.sin(t * 9) * 0.4, 92);
  else if (mood === 'point') arm(52, -Math.PI * 0.08 + Math.sin(t * 2.5) * 0.05, 100);
  else if (mood === 'cheer') {
    arm(-52, Math.PI * 1.15 + Math.sin(t * 8) * 0.15, 96);
    arm(52, -Math.PI * 0.15 + Math.sin(t * 8 + 1) * 0.15, 96);
  } else arm(52, Math.PI * 0.38, 86);

  // body
  fillRR(c, -50, -158, 100, 118, 30, linear(c, 0, -158, 0, -40, [[0, '#3B82F6'], [1, '#1D4ED8']]));
  glow(c, 0, -100, 34, '#FDE68A', 0.8);
  c.fillStyle = '#FDE68A';
  c.beginPath();
  c.arc(0, -100, 11 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2);
  c.fill();

  // head
  fillRR(c, -98, -344, 196, 168, 48, linear(c, 0, -344, 0, -176, [[0, '#BAE6FD'], [1, '#38BDF8']]));
  fillRR(c, -118, -290, 20, 56, 9, '#1E40AF');
  fillRR(c, 98, -290, 20, 56, 9, '#1E40AF');
  fillRR(c, -76, -322, 152, 118, 34, '#0B1230');
  const blink = t % 3.4 < 0.13 ? 0.12 : 1;
  const eyeY = mood === 'think' ? -270 : -266;
  for (const ex of [-32, 32]) {
    glow(c, ex, eyeY, 30, '#67E8F9', 0.55);
    c.fillStyle = '#67E8F9';
    c.beginPath();
    c.ellipse(ex, eyeY, 14, 19 * blink, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(ex - 4, eyeY - 6 * blink, 4.5, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#67E8F9';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  if (mood === 'think') {
    c.moveTo(-14, -228);
    c.lineTo(16, -232);
  } else if (mood === 'cheer') c.arc(0, -246, 26, 0.05 * Math.PI, 0.95 * Math.PI);
  else c.arc(0, -244, 22, 0.15 * Math.PI, 0.85 * Math.PI);
  c.stroke();
  c.fillStyle = 'rgba(255,140,160,.55)';
  c.beginPath();
  c.arc(-52, -236, 8, 0, Math.PI * 2);
  c.arc(52, -236, 8, 0, Math.PI * 2);
  c.fill();

  // antenna
  c.strokeStyle = '#CBD5E1';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(0, -344);
  c.lineTo(0, -374);
  c.stroke();
  glow(c, 0, -386, 26, '#FDE68A', 0.5 + Math.sin(t * 4) * 0.2);
  c.fillStyle = '#FBBF24';
  c.beginPath();
  c.arc(0, -386, 13, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A speech bubble with its tail pointing down-left at (tx, ty). */
export function bubble(c: Ctx, x: number, y: number, w: number, h: number, tx: number, ty: number, fill = '#fff'): void {
  c.save();
  c.shadowColor = 'rgba(0,0,0,.3)';
  c.shadowBlur = 22;
  c.shadowOffsetY = 8;
  rrPath(c, x, y, w, h, 34);
  c.fillStyle = fill;
  c.fill();
  c.beginPath();
  c.moveTo(x + 40, y + h - 4);
  c.lineTo(tx, ty);
  c.lineTo(x + 96, y + h - 4);
  c.closePath();
  c.fill();
  c.restore();
}

// ─── Subtitles ──────────────────────────────────────────────────────────────

interface Run {
  word: string;
  hot: boolean;
}

function highlightMask(textStr: string, phrases: string[]): boolean[] {
  const lower = textStr.toLowerCase();
  const mask = new Array<boolean>(textStr.length).fill(false);
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    const p = phrase.toLowerCase().trim();
    if (p.length < 3) continue;
    let at = lower.indexOf(p);
    while (at !== -1) {
      const before = at === 0 || /\W/.test(lower[at - 1]);
      const after = at + p.length >= lower.length || /\W/.test(lower[at + p.length]);
      if (before && after && !mask.slice(at, at + p.length).some(Boolean)) for (let i = at; i < at + p.length; i++) mask[i] = true;
      at = lower.indexOf(p, at + 1);
    }
  }
  return mask;
}

function runsOf(textStr: string, phrases: string[]): Run[] {
  const mask = highlightMask(textStr, phrases);
  const runs: Run[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(textStr))) {
    const hot = mask.slice(m.index, m.index + m[0].length).filter(Boolean).length >= Math.ceil(m[0].length / 2);
    runs.push({ word: m[0], hot });
  }
  return runs;
}

export function activeCue(cues: PlanCue[], t: number): PlanCue | null {
  for (const cue of cues) if (t >= cue.start - 0.05 && t <= cue.end + 0.3) return cue;
  return null;
}

/** Subtitles: at most two lines, large, high contrast, key terms highlighted. */
export function drawSubtitle(c: Ctx, cue: PlanCue, t: number, phrases: string[]): void {
  const fade = Math.min(clamp01((t - (cue.start - 0.05)) / 0.14), clamp01((cue.end + 0.3 - t) / 0.18));
  if (fade <= 0) return;
  let size = 52;
  let lines: Run[][] = [];
  const maxW = 1500;
  const runs = runsOf(cue.text, phrases);
  for (; size >= 38; size -= 4) {
    c.font = fontOf(size, 700);
    const space = c.measureText(' ').width;
    lines = [[]];
    let lineW = 0;
    for (const r of runs) {
      const w = c.measureText(r.word).width;
      if (lines[lines.length - 1].length && lineW + space + w > maxW) {
        lines.push([]);
        lineW = 0;
      }
      lines[lines.length - 1].push(r);
      lineW += (lineW ? space : 0) + w;
    }
    if (lines.length <= 2) break;
  }
  const lineH = size * 1.3;
  c.font = fontOf(size, 700);
  const widths = lines.map((ln) => ln.reduce((sum, r, i) => sum + c.measureText(r.word).width + (i ? c.measureText(' ').width : 0), 0));
  const boxW = Math.max(...widths) + 76;
  const boxH = lines.length * lineH + 30;
  const x0 = (W - boxW) / 2;
  const y0 = H - 52 - boxH;
  c.save();
  c.globalAlpha *= fade;
  fillRR(c, x0, y0, boxW, boxH, 26, 'rgba(6,4,28,.78)');
  lines.forEach((ln, li) => {
    let x = (W - widths[li]) / 2;
    const y = y0 + 15 + li * lineH + lineH * 0.72;
    for (const r of ln) {
      c.font = fontOf(size, r.hot ? 900 : 700);
      c.fillStyle = r.hot ? '#FFD166' : '#fff';
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.fillText(r.word, x, y);
      x += c.measureText(r.word + ' ').width;
    }
  });
  c.restore();
}

// ─── Celebration ────────────────────────────────────────────────────────────

export function burst(c: Ctx, cx: number, cy: number, p: number, colors: string[], seed = 1): void {
  if (p <= 0 || p >= 1) return;
  const r = rng(seed);
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2 + r() * 0.4;
    const dist = (60 + r() * 150) * ease.out3(p);
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist + p * p * 40;
    sparkle(c, x, y, 5 + r() * 9, colors[i % colors.length], 1 - p);
  }
}

export { wrap };
