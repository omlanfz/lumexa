// The six scenes of every lesson preview video, following the Lumexa production template:
//   1 Hook · 2 Meet the concept · 3 Explore and understand · 4 See it in action ·
//   5 Remember this · 6 Your turn (and the Lumexa end card).
// Each scene is a pure function of time. Which sound effect belongs where is decided here too
// (scheduleSfx), next to the animation it accompanies.

import { lineNumbers } from './blocks';
import { drawDemo, drawStackInBox, RUN_DELAY } from './demos';
import { bubble, burst, chip, drawPixel, panel } from './world';
import {
  H,
  W,
  clamp01,
  ease,
  emoji,
  fillRR,
  fontOf,
  glow,
  hexA,
  linear,
  pop,
  prog,
  rng,
  sparkle,
  strokeRR,
  text,
  wrap,
  type Ctx,
} from './kit';
import type { SfxEvent, VideoPlan } from './plan';

const sceneOf = (plan: VideoPlan, i: number) => plan.scenes[i];
/** Pixel's feet: clear of the subtitle bar. */
const PIXEL_Y = 830;
const BLOCK_COLORS = [
  '#4C97FF',
  '#9966FF',
  '#FFBF00',
  '#FFAB19',
  '#59C059',
  '#5CB1D6',
  '#FF6680',
];

/** Fades a scene in over 0.35 s and out over its last 0.3 s. */
export function sceneAlpha(plan: VideoPlan, i: number, t: number): number {
  const s = sceneOf(plan, i);
  return Math.min(clamp01((t - s.start) / 0.35), clamp01((s.end - t) / 0.3));
}

const accentGradient = (c: Ctx, plan: VideoPlan, x0: number, x1: number) =>
  linear(c, x0, 0, x1, 0, [
    [0, plan.accent[0]],
    [1, plan.accent[1]],
  ]);

// ─── 1 · Hook ───────────────────────────────────────────────────────────────

function drawHook(c: Ctx, plan: VideoPlan, t: number): void {
  const s = sceneOf(plan, 0);
  const u = t - s.start;
  const lines = wrap(c, plan.hook, 1030, 88, 900).slice(0, 4);
  const size = lines.length > 3 ? 72 : 88;
  const lh = size * 1.18;
  const top = 540 - (lines.length * lh) / 2;
  pop(c, 600, 520, prog(u, 0.35, 0.6), () => {
    lines.forEach((l, i) =>
      text(c, l, 120, top + i * lh + size * 0.85, {
        size,
        weight: 900,
        color: '#fff',
        shadow: true,
      }),
    );
  });
  // a sparkle underline
  const under = ease.out3(prog(u, 1.2, 0.8));
  if (under > 0) {
    c.fillStyle = accentGradient(c, plan, 120, 720);
    fillRR(
      c,
      120,
      top + lines.length * lh + 8,
      600 * under,
      10,
      5,
      accentGradient(c, plan, 120, 720),
    );
    sparkle(
      c,
      120 + 600 * under,
      top + lines.length * lh + 13,
      18,
      '#fff',
      under,
    );
  }
  // the mystery: the lesson's own picture, made of orbiting blocks
  const cx = 1480;
  const cy = 500;
  glow(c, cx, cy, 330, plan.accent[1], 0.4 + Math.sin(u * 2) * 0.05);
  pop(c, cx, cy, prog(u, 0.2, 0.7), () => {
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.beginPath();
    c.arc(cx, cy, 190, 0, Math.PI * 2);
    c.fill();
    strokeRR(c, cx - 190, cy - 190, 380, 380, 190, 'rgba(255,255,255,.55)', 4);
    emoji(c, plan.lesson.emoji, cx, cy, 230 + Math.sin(u * 2.4) * 8);
  });
  for (let i = 0; i < 7; i++) {
    const ang = u * 0.55 + (i / 7) * Math.PI * 2;
    const r = 300 + Math.sin(u * 1.3 + i) * 16;
    const bx = cx + Math.cos(ang) * r;
    const by = cy + Math.sin(ang) * r * 0.62;
    const show = prog(u, 0.9 + i * 0.12, 0.4);
    if (show <= 0) continue;
    c.save();
    c.translate(bx, by);
    c.rotate(Math.sin(u + i) * 0.25);
    c.globalAlpha *= show;
    const col = BLOCK_COLORS[i % BLOCK_COLORS.length];
    fillRR(c, -62, -22, 124, 50, 10, hexA('#000000', 0.25));
    fillRR(c, -62, -26, 124, 50, 10, col);
    fillRR(c, -40, -34, 38, 12, 5, col);
    c.restore();
  }
  // the "on screen" idea
  const chipAt = Math.max(2.8, s.end - s.start - 3.6);
  const cp = prog(u, chipAt, 0.5);
  if (cp > 0) {
    pop(c, 400, top + lines.length * lh + 90, cp, () => {
      chip(c, s.onScreen, 120, top + lines.length * lh + 50, {
        size: 38,
        fill: accentGradient(c, plan, 120, 700),
        h: 74,
      });
    });
  }
}

// ─── 2 · Meet the concept ───────────────────────────────────────────────────

const introChipAt = (i: number) => 2.4 + i * 0.75;

function drawIntro(c: Ctx, plan: VideoPlan, t: number): void {
  const s = sceneOf(plan, 1);
  const u = t - s.start;
  drawPixel(
    c,
    300,
    PIXEL_Y,
    1.0,
    t,
    u < 4.5 ? 'wave' : 'idle',
    ease.out3(prog(u, 0, 0.5)),
  );
  const a = ease.out3(prog(u, 0.3, 0.5));
  text(c, 'TODAY WE’RE GOING TO DISCOVER', 620, 255, {
    size: 30,
    weight: 800,
    color: hexA('#ffffff', 0.78),
    alpha: a,
  });
  pop(c, 1210, 400, prog(u, 0.7, 0.6), () => {
    fillRR(
      c,
      620,
      290,
      1180,
      200,
      40,
      linear(c, 620, 290, 1800, 490, [
        [0, plan.accent[0]],
        [1, plan.accent[1]],
      ]),
    );
    strokeRR(c, 620, 290, 1180, 200, 40, 'rgba(255,255,255,.55)', 3);
    emoji(c, plan.lesson.emoji, 724, 392, 124);
    const lines = wrap(c, plan.lesson.title, 900, 84, 900).slice(0, 2);
    const size = lines.length > 1 ? 66 : 84;
    lines.forEach((l, i) =>
      text(
        c,
        l,
        830,
        392 + (i - (lines.length - 1) / 2) * size * 1.12 + size * 0.34,
        { size, weight: 900, shadow: true },
      ),
    );
  });
  const concepts = plan.concepts.slice(0, 4);
  concepts.forEach((cn, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 620 + col * 600;
    const y = 540 + row * 118;
    pop(c, x + 290, y + 48, prog(u, introChipAt(i), 0.45), () => {
      fillRR(c, x, y, 580, 100, 34, 'rgba(255,255,255,.14)');
      strokeRR(c, x, y, 580, 100, 34, 'rgba(255,255,255,.28)', 2);
      emoji(c, cn.emoji, x + 58, y + 50, 56);
      const lines = wrap(c, cn.title, 450, 36, 800).slice(0, 2);
      lines.forEach((l, li) =>
        text(c, l, x + 112, y + 50 + (li - (lines.length - 1) / 2) * 38 + 12, {
          size: 36,
          weight: 800,
        }),
      );
    });
  });
}

// ─── 3 · Explore and understand ─────────────────────────────────────────────

const STACK_FROM = 1.8;

function revealTimes(plan: VideoPlan): {
  lines: number[];
  at: (line: number) => number;
  end: number;
} {
  const s = sceneOf(plan, 2);
  const lines = lineNumbers(plan.example.lines);
  const span = Math.max(3, s.end - s.start - STACK_FROM - 8.5);
  const step = Math.min(1.1, Math.max(0.45, span / Math.max(1, lines.length)));
  return {
    lines,
    at: (line) => STACK_FROM + Math.max(0, lines.indexOf(line)) * step,
    end: STACK_FROM + lines.length * step,
  };
}

function drawExplain(c: Ctx, plan: VideoPlan, t: number): void {
  const s = sceneOf(plan, 2);
  const u = t - s.start;
  const len = s.end - s.start;
  const concepts = plan.concepts.slice(0, 4);
  const window0 = 1.2;
  const window1 = len - 1.8;
  const active = Math.min(
    concepts.length - 1,
    Math.max(
      0,
      Math.floor(
        ((u - window0) / Math.max(1, window1 - window0)) * concepts.length,
      ),
    ),
  );

  // left: the ideas, one at a time
  let y = 190;
  concepts.forEach((cn, i) => {
    const isActive = i === active;
    const h = isActive ? 214 : 98;
    const reveal = prog(u, 0.3 + i * 0.3, 0.45);
    pop(c, 110 + 340, y + h / 2, reveal, () => {
      c.save();
      c.globalAlpha *= isActive ? 1 : 0.62;
      fillRR(
        c,
        110,
        y,
        700,
        h,
        32,
        isActive
          ? linear(c, 110, y, 810, y + h, [
              [0, hexA(plan.accent[0], 0.95)],
              [1, hexA(plan.accent[1], 0.95)],
            ])
          : 'rgba(255,255,255,.1)',
      );
      strokeRR(
        c,
        110,
        y,
        700,
        h,
        32,
        isActive ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.2)',
        isActive ? 3 : 2,
      );
      emoji(c, cn.emoji, 178, y + 50, 56);
      text(c, cn.title, 240, y + 50, { size: 40, weight: 900, base: 'middle' });
      if (isActive) {
        wrap(c, cn.text, 640, 33, 600)
          .slice(0, 4)
          .forEach((l, li) =>
            text(c, l, 150, y + 118 + li * 40, {
              size: 33,
              weight: 600,
              color: 'rgba(255,255,255,.95)',
            }),
          );
      }
      c.restore();
    });
    y += h + 16;
  });

  // right: the idea, built from real blocks
  const box = { x: 870, y: 200, w: 940, h: 640 };
  panel(c, box.x, box.y, box.w, box.h);
  chip(
    c,
    plan.example.language === 'edublocks' ? 'THE CODE' : 'THE BLOCKS',
    box.x + 28,
    box.y + 22,
    { size: 24, h: 48, fill: 'rgba(255,255,255,.14)' },
  );
  const times = revealTimes(plan);
  const built = u >= times.end + 0.2;
  const hotIndex = built
    ? Math.floor((u - times.end - 0.2) / 0.85) % Math.max(1, times.lines.length)
    : -1;
  const hot = hotIndex >= 0 ? times.lines[hotIndex] : -1;
  const cursor = built
    ? hotIndex / Math.max(1, times.lines.length - 1)
    : clamp01((u - STACK_FROM) / Math.max(0.1, times.end - STACK_FROM));
  drawStackInBox(c, plan.example.lines, plan.example.language, box, {
    reveal: (line) => prog(u, times.at(line), 0.5),
    highlight: (line) => (line === hot ? 1 : 0),
    cursor,
  });
  if (built && u > times.end + 0.4)
    text(c, plan.example.title, box.x + box.w - 30, box.y + box.h - 28, {
      size: 26,
      weight: 700,
      align: 'right',
      color: 'rgba(255,255,255,.7)',
    });
}

// ─── 5 · Remember this ──────────────────────────────────────────────────────

function drawTip(c: Ctx, plan: VideoPlan, t: number): void {
  const s = sceneOf(plan, 4);
  const u = t - s.start;
  drawPixel(c, 300, PIXEL_Y, 1.0, t, 'point', ease.out3(prog(u, 0, 0.5)));
  const mistake = plan.tip.kind === 'mistake';
  const x = 560;
  const y = 200;
  const w = 1240;
  const titleLines = wrap(c, plan.tip.title, w - 100, 64, 900).slice(
    0,
    2,
  ).length;
  const bodyLines = wrap(c, plan.tip.text, w - 120, 44, 600).slice(0, 4).length;
  const sideLines = Math.max(
    wrap(c, plan.tip.text, (w - 130) / 2 - 60, 32, 600).slice(0, 4).length,
    wrap(c, plan.tip.fix ?? '', (w - 130) / 2 - 60, 32, 600).slice(0, 4).length,
  );
  const h =
    mistake && plan.tip.fix
      ? 190 + titleLines * 72 + 100 + sideLines * 40 + 40
      : 170 + titleLines * 72 + bodyLines * 58 + 70;
  pop(c, x + w / 2, y + h / 2, prog(u, 0.4, 0.55), () => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,.35)';
    c.shadowBlur = 30;
    c.shadowOffsetY = 12;
    fillRR(c, x, y, w, h, 44, '#FFFFFF');
    c.restore();
    chip(c, mistake ? '⚠  WATCH OUT' : '💡  REMEMBER THIS', x + 44, y + 36, {
      size: 30,
      h: 64,
      fill: mistake ? '#F97316' : '#F59E0B',
      color: '#fff',
    });
    const title = wrap(c, plan.tip.title, w - 100, 64, 900).slice(0, 2);
    title.forEach((l, i) =>
      text(c, l, x + 50, y + 170 + i * 72, {
        size: 64,
        weight: 900,
        color: '#1e1b4b',
      }),
    );
    const bodyTop = y + 170 + title.length * 72 - 10;
    if (mistake && plan.tip.fix) {
      const half = (w - 130) / 2;
      const reveal = prog(u, 1.8, 0.5);
      const reveal2 = prog(u, 3.4, 0.5);
      const rows = Math.max(
        wrap(c, plan.tip.text, half - 60, 32, 600).slice(0, 4).length,
        wrap(c, plan.tip.fix ?? '', half - 60, 32, 600).slice(0, 4).length,
      );
      const cardH = 100 + rows * 40;
      pop(c, x + 50 + half / 2, bodyTop + cardH / 2, reveal, () => {
        fillRR(c, x + 50, bodyTop, half, cardH, 28, '#FEE2E2');
        text(c, '✗  The problem', x + 80, bodyTop + 52, {
          size: 32,
          weight: 900,
          color: '#B91C1C',
        });
        wrap(c, plan.tip.text, half - 60, 32, 600)
          .slice(0, 4)
          .forEach((l, i) =>
            text(c, l, x + 80, bodyTop + 104 + i * 40, {
              size: 32,
              weight: 600,
              color: '#450a0a',
            }),
          );
      });
      pop(c, x + 80 + half + half / 2, bodyTop + cardH / 2, reveal2, () => {
        fillRR(c, x + 80 + half, bodyTop, half, cardH, 28, '#DCFCE7');
        text(c, '✓  The fix', x + 110 + half, bodyTop + 52, {
          size: 32,
          weight: 900,
          color: '#15803D',
        });
        wrap(c, plan.tip.fix ?? '', half - 60, 32, 600)
          .slice(0, 4)
          .forEach((l, i) =>
            text(c, l, x + 110 + half, bodyTop + 104 + i * 40, {
              size: 32,
              weight: 600,
              color: '#052e16',
            }),
          );
      });
    } else {
      const reveal = prog(u, 1.4, 0.6);
      c.save();
      c.globalAlpha *= reveal;
      wrap(c, plan.tip.text, w - 120, 44, 600)
        .slice(0, 4)
        .forEach((l, i) =>
          text(c, l, x + 50, bodyTop + 50 + i * 58, {
            size: 44,
            weight: 600,
            color: '#334155',
          }),
        );
      c.restore();
    }
  });
}

// ─── 6 · Your turn! (and the end card) ──────────────────────────────────────

const END_CARD = 3.3;

function drawChallenge(c: Ctx, plan: VideoPlan, t: number): void {
  const s = sceneOf(plan, 5);
  const u = t - s.start;
  const len = s.end - s.start;
  const end = prog(u, len - END_CARD, 0.5);
  const body = 1 - ease.out3(end);
  drawPixel(
    c,
    300,
    PIXEL_Y,
    1.0,
    t,
    'cheer',
    ease.out3(prog(u, 0, 0.5)) * body,
  );
  c.save();
  c.globalAlpha *= body;
  pop(c, 1180, 270, prog(u, 0.3, 0.55), () => {
    text(c, 'YOUR TURN!', 560, 280, {
      size: 118,
      weight: 900,
      color: '#FFD166',
      shadow: true,
    });
    sparkle(c, 1170, 210, 22, '#fff', 0.9 + Math.sin(u * 5) * 0.1);
  });
  const promptSize =
    wrap(c, plan.challenge.prompt, 1130, 50, 800).length > 2 ? 44 : 50;
  const promptLines = wrap(
    c,
    plan.challenge.prompt,
    1130,
    promptSize,
    800,
  ).slice(0, 3);
  const cardH = 56 + promptLines.length * (promptSize + 14);
  const cardReveal = prog(u, 1.0, 0.55);
  pop(c, 1180, 330 + cardH / 2, cardReveal, () => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,.3)';
    c.shadowBlur = 26;
    c.shadowOffsetY = 10;
    fillRR(c, 560, 330, 1240, cardH, 40, '#fff');
    c.restore();
    promptLines.forEach((l, i) =>
      text(c, l, 600, 330 + 28 + promptSize + i * (promptSize + 14) - 6, {
        size: promptSize,
        weight: 800,
        color: '#1e1b4b',
      }),
    );
  });
  // the choices are shown, never answered
  const optTop = 330 + cardH + 28;
  const opts =
    plan.challenge.kind === 'choose' ? plan.challenge.options.slice(0, 4) : [];
  opts.forEach((o, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ox = 560 + col * 626;
    const oy = optTop + row * 82;
    pop(c, ox + 307, oy + 32, prog(u, 2.2 + i * 0.35, 0.4), () => {
      fillRR(c, ox, oy, 614, 70, 35, 'rgba(255,255,255,.16)');
      strokeRR(c, ox, oy, 614, 70, 35, 'rgba(255,255,255,.4)', 2);
      let label = o.replace(/[(){}\[\]]/g, '');
      if (label.length > 36) label = `${label.slice(0, 35)}…`;
      text(c, label, ox + 307, oy + 36, {
        size: 30,
        weight: 700,
        align: 'center',
        base: 'middle',
      });
    });
  });
  if (plan.challenge.kind === 'order') {
    const rev = prog(u, 2.4, 0.5);
    c.save();
    c.globalAlpha *= rev;
    text(c, 'Put the blocks in the right order!', 1180, optTop + 50, {
      size: 40,
      weight: 800,
      align: 'center',
      color: '#e0e7ff',
    });
    c.restore();
  }
  const rows =
    plan.challenge.kind === 'choose' ? Math.ceil(opts.length / 2) : 1;
  const missionY = Math.min(836 - 76, optTop + rows * 82 + 22);
  const mission = prog(u, 4.2, 0.5);
  if (mission > 0) {
    pop(c, 1180, missionY + 38, mission, () => {
      const label = `MISSION:  ${plan.project.name}`;
      c.font = fontOf(36, 900);
      const w = c.measureText(label).width + 80;
      fillRR(
        c,
        1180 - w / 2,
        missionY,
        w,
        76,
        38,
        accentGradient(c, plan, 1180 - w / 2, 1180 + w / 2),
      );
      text(c, label, 1180, missionY + 39, {
        size: 36,
        weight: 900,
        align: 'center',
        base: 'middle',
      });
    });
  }
  c.restore();

  // the Lumexa end card
  if (end > 0) endCard(c, plan, u - (len - END_CARD), end);
}

let endLogo: HTMLImageElement | null = null;
export function setLogo(img: HTMLImageElement | null): void {
  endLogo = img;
}

function endCard(c: Ctx, plan: VideoPlan, v: number, a: number): void {
  c.save();
  c.globalAlpha *= clamp01(a);
  c.fillStyle = linear(c, 0, 0, W, H, [
    [0, '#0A0826'],
    [1, '#231A78'],
  ]);
  c.fillRect(0, 0, W, H);
  glow(c, W / 2, 470, 520, plan.accent[1], 0.3);
  glow(c, W / 2, 470, 360, '#7C6CFF', 0.28);
  const p = ease.outBack(clamp01(v / 0.8));
  c.save();
  c.translate(W / 2, 410);
  c.scale(p, p);
  if (endLogo) {
    c.save();
    fillRR(c, -170, -170, 340, 340, 80, '#0D0B2E');
    c.restore();
    c.save();
    c.beginPath();
    c.roundRect(-170, -170, 340, 340, 80);
    c.clip();
    c.drawImage(endLogo, -170, -170, 340, 340);
    c.restore();
    strokeRR(c, -170, -170, 340, 340, 80, 'rgba(255,255,255,.35)', 3);
  }
  c.restore();
  text(c, 'Let’s get started!', W / 2, 740, {
    size: 104,
    weight: 900,
    align: 'center',
    color: '#fff',
    alpha: clamp01((v - 0.3) / 0.5),
    shadow: true,
  });
  text(c, `LUMEXA  ·  LITTLE CODERS`, W / 2, 810, {
    size: 38,
    weight: 800,
    align: 'center',
    color: hexA('#ffffff', 0.78),
    alpha: clamp01((v - 0.6) / 0.5),
  });
  burst(
    c,
    W / 2 - 330,
    420,
    clamp01((v - 0.2) / 1.6),
    ['#FFD166', '#fff', plan.accent[0], '#67E8F9'],
    3,
  );
  burst(
    c,
    W / 2 + 330,
    420,
    clamp01((v - 0.35) / 1.6),
    ['#FFD166', '#fff', plan.accent[1], '#F0ABFC'],
    9,
  );
  c.restore();
}

// ─── Master draw ────────────────────────────────────────────────────────────

export function drawScene(c: Ctx, plan: VideoPlan, i: number, t: number): void {
  const s = sceneOf(plan, i);
  const a = sceneAlpha(plan, i, t);
  if (a <= 0) return;
  c.save();
  // the closing scene keeps its end card fully opaque, so it fades in over the previous scene's tail instead
  c.globalAlpha *= i === 5 ? clamp01((t - s.start) / 0.35) : a;
  c.translate(0, (1 - ease.out3(clamp01((t - s.start) / 0.45))) * 24);
  switch (i) {
    case 0:
      drawHook(c, plan, t);
      break;
    case 1:
      drawIntro(c, plan, t);
      break;
    case 2:
      drawExplain(c, plan, t);
      break;
    case 3:
      drawDemo(c, plan, t - s.start, s.end - s.start);
      break;
    case 4:
      drawTip(c, plan, t);
      break;
    default:
      drawChallenge(c, plan, t);
  }
  c.restore();
}

export function sceneIndexAt(plan: VideoPlan, t: number): number {
  for (let i = plan.scenes.length - 1; i >= 0; i--)
    if (t >= plan.scenes[i].start) return i;
  return 0;
}

// ─── Sound effects ──────────────────────────────────────────────────────────

/** A few purposeful sounds: a whoosh between scenes, a pop when something appears, a chime when it works. */
export function scheduleSfx(plan: VideoPlan): SfxEvent[] {
  const out: SfxEvent[] = [];
  plan.scenes.forEach((s, i) =>
    out.push({ t: s.start + 0.05, kind: 'whoosh' }),
  );
  const hook = plan.scenes[0];
  out.push({ t: hook.start + 0.4, kind: 'pop' });
  out.push({
    t: hook.start + Math.max(2.8, hook.end - hook.start - 3.6),
    kind: 'chime',
  });
  const intro = plan.scenes[1];
  out.push({ t: intro.start + 0.75, kind: 'pop' });
  plan.concepts
    .slice(0, 4)
    .forEach((_, i) =>
      out.push({ t: intro.start + introChipAt(i) + 0.1, kind: 'pop' }),
    );
  const explain = plan.scenes[2];
  const times = revealTimes(plan);
  times.lines
    .slice(0, 7)
    .forEach((l) =>
      out.push({ t: explain.start + times.at(l) + 0.12, kind: 'click' }),
    );
  out.push({ t: explain.start + times.end + 0.3, kind: 'chime' });
  const demo = plan.scenes[3];
  out.push({ t: demo.start + RUN_DELAY - 0.4, kind: 'click' });
  out.push({ t: demo.end - 3.1, kind: 'success' });
  const tip = plan.scenes[4];
  out.push({ t: tip.start + 0.45, kind: 'pop' });
  if (plan.tip.kind === 'mistake' && plan.tip.fix)
    out.push({ t: tip.start + 3.5, kind: 'chime' });
  const last = plan.scenes[5];
  out.push({ t: last.start + 0.4, kind: 'pop' });
  out.push({ t: last.start + 4.2, kind: 'pop' });
  out.push({ t: last.end - END_CARD + 0.2, kind: 'success' });
  out.push({ t: last.end - END_CARD + 0.9, kind: 'sparkle' });
  return out.sort((a, b) => a.t - b.t);
}

export { rng };
