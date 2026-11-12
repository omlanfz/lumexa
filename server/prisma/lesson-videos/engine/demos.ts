// The "See it in action" scene: the lesson's own demonstration, played by the same runtimes the
// interactive lesson page uses (Scratch stage, Python interpreter, practice AI) — so what the video
// shows is exactly what the child will see when they press the button in the lesson.

import {
  ScratchStage,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  FRAME_MS,
  type SpriteView,
  type StageView,
} from '../../../../client/lib/littleCoders/scratchRuntime';
import {
  runPython,
  type PyResult,
} from '../../../../client/lib/littleCoders/pythonRuntime';
import {
  addExample,
  best,
  newModel,
  percent,
  predict,
  type SimModel,
} from '../../../../client/lib/littleCoders/aiSim';
import { drawStack, lineNumbers, measureStack, type Language } from './blocks';
import { chip, panel } from './world';
import {
  clamp01,
  ease,
  emoji,
  fillRR,
  fontOf,
  hexA,
  linear,
  pop,
  prog,
  rng,
  rrPath,
  strokeRR,
  text,
  wrap,
  type Ctx,
} from './kit';
import type { VideoPlan } from './plan';

type StageDemo = Extract<VideoPlan['demo'], { kind: 'scratch-stage' }>;
type PythonDemo = Extract<VideoPlan['demo'], { kind: 'python-run' }>;
type AiImageDemo = Extract<VideoPlan['demo'], { kind: 'ai-image' }>;
type AiVoiceDemo = Extract<VideoPlan['demo'], { kind: 'ai-voice' }>;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TOP = 200;
const HEIGHT = 640;
const EDGE_L = 110;
const EDGE_R = 1810;
const GAP = 40;

/** The two panels of the demo scene; the script panel grows when the script is wide. */
function boxes(
  c: Ctx,
  lines: string[],
  language: Language,
  minLeft = 720,
  maxLeft = 1000,
): { left: Box; right: Box } {
  const size = measureStack(c, lines, language);
  const leftW = Math.round(
    Math.max(minLeft, Math.min(maxLeft, size.w * 0.85 + 96)),
  );
  return {
    left: { x: EDGE_L, y: TOP, w: leftW, h: HEIGHT },
    right: {
      x: EDGE_L + leftW + GAP,
      y: TOP,
      w: EDGE_R - EDGE_L - leftW - GAP,
      h: HEIGHT,
    },
  };
}

/** The run starts a little after the scene begins (the narration says "watch"). */
export const RUN_DELAY = 1.6;

// ─── A script inside a panel (scrolls to follow the running block when it is long) ──

const MIN_SCALE = 0.66;

export function drawStackInBox(
  c: Ctx,
  lines: string[],
  language: Language,
  box: Box,
  o: {
    highlight?: (line: number) => number;
    reveal?: (line: number) => number;
    cursor?: number;
    max?: number;
  } = {},
): void {
  const size = measureStack(c, lines, language);
  const inner = { x: box.x + 28, y: box.y + 84, w: box.w - 56, h: box.h - 104 };
  const k = Math.max(
    MIN_SCALE,
    Math.min(
      o.max ?? 1.15,
      inner.w / Math.max(1, size.w),
      inner.h / Math.max(1, size.h),
    ),
  );
  const overflow = Math.max(0, size.h * k - inner.h);
  const cursor = clamp01(o.cursor ?? 0);
  const pan = overflow * ease.inOut3(cursor);
  c.save();
  rrPath(c, box.x + 6, box.y + 78, box.w - 12, box.h - 90, 22);
  c.clip();
  c.translate(inner.x + 8, inner.y - pan);
  c.scale(k, k);
  drawStack(c, lines, language, 0, 0, {
    highlight: o.highlight,
    reveal: o.reveal,
  });
  c.restore();
}

/** The block being "run" right now: walks down the script, a block every half second. */
function runningLine(
  lines: string[],
  since: number,
  step = 0.55,
): { line: number; fraction: number } {
  const nums = lineNumbers(lines);
  if (!nums.length || since < 0) return { line: -1, fraction: 0 };
  const index = Math.floor(since / step);
  const at = index % nums.length;
  return {
    line: nums[at],
    fraction: nums.length > 1 ? at / (nums.length - 1) : 0,
  };
}

// ─── Scratch stage ──────────────────────────────────────────────────────────

const BACKDROPS: Record<string, [string, string]> = {
  space: ['#18286a', '#4636b0'],
  night: ['#1b2a52', '#35679c'],
  sky: ['#7dd3fc', '#e0f2fe'],
  grass: ['#bae6fd', '#bae6fd'],
  plain: ['#f9fafb', '#e5e7eb'],
};

let stageSim: { key: string; stage: ScratchStage; ticks: number } | null = null;

function simAt(
  plan: VideoPlan,
  demo: StageDemo,
  runSeconds: number,
): StageView {
  const key = plan.lesson.title + plan.seed;
  const targetTicks = Math.max(0, Math.floor((runSeconds * 1000) / FRAME_MS));
  if (!stageSim || stageSim.key !== key || stageSim.ticks > targetTicks) {
    const r = rng(plan.seed + 5);
    const stage = new ScratchStage(
      { sprites: demo.sprites, scripts: demo.scripts, backdrop: demo.backdrop },
      { rand: r },
    );
    stage.greenFlag();
    stageSim = { key, stage, ticks: 0 };
  }
  const sim = stageSim;
  const keys = demo.keys ?? [];
  while (sim.ticks < targetTicks) {
    // Keyboard demos: press each key in turn so something happens on stage.
    const now = (sim.ticks * FRAME_MS) / 1000;
    keys.forEach((k, i) => {
      const down = 1.2 + i * 2.2;
      if (Math.abs(now - down) < FRAME_MS / 2000) sim.stage.pressKey(k);
      if (Math.abs(now - (down + 1.0)) < FRAME_MS / 2000)
        sim.stage.releaseKey(k);
    });
    sim.stage.tick();
    sim.ticks++;
  }
  return sim.stage.view();
}

function paintBackdrop(
  c: Ctx,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const known = BACKDROPS[name];
  c.save();
  rrPath(c, x, y, w, h, 24);
  c.clip();
  if (known) {
    c.fillStyle =
      name === 'grass'
        ? linear(c, 0, y, 0, y + h, [
            [0, '#bae6fd'],
            [0.58, '#bae6fd'],
            [0.581, '#4ade80'],
            [1, '#4ade80'],
          ])
        : linear(c, 0, y, 0, y + h, [
            [0, known[0]],
            [1, known[1]],
          ]);
    c.fillRect(x, y, w, h);
    if (name === 'space' || name === 'night') {
      const r = rng(11);
      for (let i = 0; i < 40; i++) {
        c.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.5})`;
        c.beginPath();
        c.arc(x + r() * w, y + r() * h, 1 + r() * 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
  } else {
    let hue = 0;
    for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    c.fillStyle = linear(c, 0, y, 0, y + h, [
      [0, `hsl(${hue},70%,70%)`],
      [1, `hsl(${(hue + 40) % 360},65%,45%)`],
    ]);
    c.fillRect(x, y, w, h);
  }
  c.restore();
}

function paintSprite(
  c: Ctx,
  s: SpriteView,
  sx: number,
  sy: number,
  k: number,
): void {
  if (!s.visible) return;
  const px = sx + (s.x + STAGE_WIDTH / 2) * k;
  const py = sy + (STAGE_HEIGHT / 2 - s.y) * k;
  const size = (s.size / 100) * 48 * k;
  c.save();
  c.translate(px, py);
  c.rotate(((s.direction - 90) * Math.PI) / 180);
  if (s.effect) c.filter = `hue-rotate(${Math.round(s.effect * 1.8)}deg)`;
  emoji(c, s.emoji, 0, 0, size);
  c.restore();
  if (s.say) {
    const lines = wrap(c, s.say.text, 300, 26, 700).slice(0, 3);
    c.font = fontOf(26, 700);
    const w = Math.max(
      90,
      Math.max(...lines.map((l) => c.measureText(l).width)) + 36,
    );
    const h = lines.length * 34 + 22;
    const bx = Math.min(
      sx + STAGE_WIDTH * k - w - 8,
      Math.max(sx + 8, px - w / 2),
    );
    const by = Math.max(sy + 8, py - size / 2 - h - 18);
    c.save();
    fillRR(c, bx, by, w, h, 22, '#fff');
    strokeRR(c, bx, by, w, h, 22, s.say.think ? '#94a3b8' : '#334155', 3);
    lines.forEach((l, i) =>
      text(c, l, bx + w / 2, by + 11 + 34 * i + 26, {
        size: 26,
        weight: 700,
        align: 'center',
        color: '#111827',
      }),
    );
    c.restore();
  }
}

function drawStageDemo(
  c: Ctx,
  plan: VideoPlan,
  demo: StageDemo,
  u: number,
  len: number,
): void {
  const allLines = demo.scripts.flatMap((s) => s.lines);
  const { left, right } = boxes(c, allLines, 'scratch', 720, 840);
  const run = u - RUN_DELAY;
  const view = simAt(plan, demo, Math.max(0, run));
  const hot = runningLine(demo.scripts[0].lines, run);

  panel(c, left.x, left.y, left.w, left.h);
  chip(c, 'THE BLOCKS', left.x + 28, left.y + 22, {
    size: 24,
    h: 48,
    fill: 'rgba(255,255,255,.14)',
  });
  drawStackInBox(c, allLines, 'scratch', left, {
    highlight: (line) => (line === hot.line ? 1 : 0),
    cursor: hot.fraction,
  });

  // the stage (4 : 3)
  const sh = right.h - 20;
  const sw = Math.min(right.w - 20, (sh * STAGE_WIDTH) / STAGE_HEIGHT);
  const sx = right.x + (right.w - sw) / 2;
  const sy = right.y + 10;
  const k = sw / STAGE_WIDTH;
  paintBackdrop(
    c,
    view.backdrop,
    sx,
    sy,
    sw,
    (sw * STAGE_HEIGHT) / STAGE_WIDTH,
  );
  for (const s of view.sprites) paintSprite(c, s, sx, sy, k);
  strokeRR(
    c,
    sx,
    sy,
    sw,
    (sw * STAGE_HEIGHT) / STAGE_WIDTH,
    24,
    'rgba(255,255,255,.4)',
    3,
  );
  view.variables.slice(0, 3).forEach(([name, value], i) => {
    chip(c, `${name}: ${value}`, sx + 18, sy + 16 + i * 58, {
      size: 26,
      h: 46,
      fill: 'rgba(15,23,42,.8)',
    });
  });

  // the green flag
  const press = prog(u, RUN_DELAY - 0.5, 0.35);
  const fx = sx + sw - 70;
  const fy = sy + 52;
  c.save();
  const pulse =
    1 + (press > 0 && press < 1 ? Math.sin(press * Math.PI) * 0.35 : 0);
  c.translate(fx, fy);
  c.scale(pulse, pulse);
  c.fillStyle = run >= 0 ? '#22c55e' : '#16a34a';
  c.beginPath();
  c.arc(0, 0, 36, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff';
  c.fillRect(-14, -18, 5, 38);
  c.beginPath();
  c.moveTo(-9, -17);
  c.quadraticCurveTo(6, -26, 12, -14);
  c.quadraticCurveTo(14, -3, 22, -6);
  c.lineTo(22, 4);
  c.quadraticCurveTo(10, 7, 6, -3);
  c.quadraticCurveTo(-1, -9, -9, -4);
  c.closePath();
  c.fill();
  c.restore();
  if (run < 0)
    text(c, 'Click the green flag!', fx - 60, fy + 12, {
      size: 28,
      weight: 800,
      align: 'right',
      color: '#fff',
      shadow: true,
    });

  doneBadge(c, u, len, right.x + right.w - 30, right.y + right.h + 26);
}

// ─── Python ─────────────────────────────────────────────────────────────────

let pyCache: { key: string; result: PyResult } | null = null;

function pythonResult(plan: VideoPlan, demo: PythonDemo): PyResult {
  const key = plan.lesson.title + demo.lines.join('|');
  if (!pyCache || pyCache.key !== key)
    pyCache = {
      key,
      result: runPython(demo.lines, demo.inputs ?? [], { seed: 7 }),
    };
  return pyCache.result;
}

function drawPythonDemo(
  c: Ctx,
  plan: VideoPlan,
  demo: PythonDemo,
  u: number,
  len: number,
): void {
  const result = pythonResult(plan, demo);
  const { left, right } = boxes(c, demo.lines, 'edublocks', 720, 1000);
  const steps = result.trace;
  const play = Math.max(5.5, Math.min(len - RUN_DELAY - 3.5, 12));
  const p = clamp01((u - RUN_DELAY) / play);
  const stepIndex = steps.length
    ? Math.min(steps.length - 1, Math.floor(p * steps.length))
    : 0;
  const active = u >= RUN_DELAY && steps.length ? steps[stepIndex] : null;

  panel(c, left.x, left.y, left.w, left.h);
  chip(c, 'THE CODE', left.x + 28, left.y + 22, {
    size: 24,
    h: 48,
    fill: 'rgba(255,255,255,.14)',
  });
  drawStackInBox(c, demo.lines, 'edublocks', left, {
    highlight: (line) => (active && line === active.line ? 1 : 0),
    cursor: active
      ? steps.length > 1
        ? stepIndex / (steps.length - 1)
        : 0
      : 0,
  });

  // output: a turtle drawing, or the console
  panel(c, right.x, right.y, right.w, right.h, {
    fill: result.turtle ? 'rgba(248,250,252,.97)' : 'rgba(6,10,30,.92)',
  });
  chip(
    c,
    result.turtle ? 'THE DRAWING' : 'WHAT IT PRINTS',
    right.x + 28,
    right.y + 22,
    {
      size: 24,
      h: 48,
      fill: result.turtle ? 'rgba(15,23,42,.1)' : 'rgba(255,255,255,.14)',
      color: result.turtle ? '#1e293b' : '#fff',
    },
  );
  const ox = right.x + 30;
  const oy = right.y + 92;
  const ow = right.w - 60;
  const oh = right.h - 120;
  if (result.turtle) {
    const t = result.turtle;
    const pts = t.segments.flatMap((s) => [
      [s.x1, s.y1],
      [s.x2, s.y2],
    ]);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const minX = Math.min(...xs, -10);
    const maxX = Math.max(...xs, 10);
    const minY = Math.min(...ys, -10);
    const maxY = Math.max(...ys, 10);
    const k = Math.min(ow / (maxX - minX + 20), oh / (maxY - minY + 20));
    const cx = ox + ow / 2 - ((minX + maxX) / 2) * k;
    const cy = oy + oh / 2 + ((minY + maxY) / 2) * k;
    const upto = Math.floor(t.segments.length * ease.inOut3(p));
    c.save();
    rrPath(c, ox, oy, ow, oh, 18);
    c.clip();
    for (const f of t.fills) {
      if (p < 1) break;
      c.fillStyle = f.color;
      c.beginPath();
      f.points.forEach(([px, py], i) =>
        i
          ? c.lineTo(cx + px * k, cy - py * k)
          : c.moveTo(cx + px * k, cy - py * k),
      );
      c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < Math.min(upto, t.segments.length); i++) {
      const s = t.segments[i];
      c.strokeStyle = s.color;
      c.lineWidth = Math.max(2.5, s.width * k * 1.2);
      c.beginPath();
      c.moveTo(cx + s.x1 * k, cy - s.y1 * k);
      c.lineTo(cx + s.x2 * k, cy - s.y2 * k);
      c.stroke();
    }
    if (u >= RUN_DELAY && upto > 0 && upto < t.segments.length) {
      const s = t.segments[upto - 1];
      emoji(c, '🐢', cx + s.x2 * k, cy - s.y2 * k, 46);
    }
    c.restore();
  } else {
    const shown = active ? result.console.slice(0, active.consoleLength) : [];
    const lines: { text: string; color: string }[] = [];
    for (const e of shown) {
      if (e.kind === 'prompt') lines.push({ text: e.text, color: '#7dd3fc' });
      else if (e.kind === 'answer')
        lines.push({ text: `  ${e.text}`, color: '#fde68a' });
      else if (e.kind === 'error')
        lines.push({ text: e.text, color: '#fca5a5' });
      else
        for (const l of e.text.split('\n'))
          lines.push({ text: l, color: '#86efac' });
    }
    const fs = lines.length > 8 ? 34 : 42;
    const maxChars = Math.floor((ow - 30) / (fs * 0.62));
    lines
      .slice(-12)
      .forEach((l, i) =>
        text(
          c,
          l.text.length > maxChars
            ? `${l.text.slice(0, maxChars - 1)}…`
            : l.text,
          ox + 14,
          oy + 22 + (i + 1) * (fs + 14),
          { size: fs, weight: 600, mono: true, color: l.color },
        ),
      );
    if (Math.floor(u * 2) % 2 === 0)
      fillRR(
        c,
        ox + 14,
        oy + 26 + (Math.min(lines.length, 12) + 1) * (fs + 14) - fs + 6,
        18,
        fs,
        3,
        '#86efac',
      );
  }

  // the Run button
  const press = prog(u, RUN_DELAY - 0.5, 0.35);
  const label = u >= RUN_DELAY ? 'Running…' : '▶  Run';
  const bw = 230;
  const bx = left.x + left.w - bw - 28;
  const by = left.y + 18;
  const scale =
    1 + (press > 0 && press < 1 ? Math.sin(press * Math.PI) * 0.12 : 0);
  c.save();
  c.translate(bx + bw / 2, by + 28);
  c.scale(scale, scale);
  fillRR(c, -bw / 2, -28, bw, 56, 28, u >= RUN_DELAY ? '#16a34a' : '#22c55e');
  text(c, label, 0, 2, {
    size: 28,
    weight: 800,
    align: 'center',
    base: 'middle',
    color: '#fff',
  });
  c.restore();
  doneBadge(c, u, len, right.x + right.w - 30, right.y + right.h + 26);
}

// ─── Practice AI ────────────────────────────────────────────────────────────

const AI_EXAMPLES = 20;
const COLLECT_FROM = 1.4;
const COLLECT_FOR = 4.2;
const TRAIN_FOR = 1.7;
const TEST_EACH = 3.0;

function drawBars(
  c: Ctx,
  names: { name: string; emoji: string }[],
  probs: number[],
  x: number,
  y: number,
  w: number,
  hot: number,
): void {
  names.forEach((n, i) => {
    const yy = y + i * 92;
    emoji(c, n.emoji, x + 30, yy + 34, 54);
    text(c, n.name, x + 78, yy + 30, { size: 34, weight: 800, base: 'middle' });
    fillRR(c, x + 78, yy + 48, w - 78, 22, 11, 'rgba(255,255,255,.14)');
    const pw = Math.max(8, (w - 78) * (probs[i] ?? 0));
    fillRR(
      c,
      x + 78,
      yy + 48,
      pw,
      22,
      11,
      i === hot
        ? linear(c, x, 0, x + w, 0, [
            [0, '#34d399'],
            [1, '#22d3ee'],
          ])
        : 'rgba(167,139,250,.85)',
    );
    text(c, percent(probs[i] ?? 0), x + w, yy + 30, {
      size: 32,
      weight: 800,
      align: 'right',
      base: 'middle',
      color: i === hot ? '#6ee7b7' : '#e9d5ff',
    });
  });
}

function drawAiDemo(
  c: Ctx,
  plan: VideoPlan,
  demo: AiImageDemo | AiVoiceDemo,
  u: number,
  len: number,
): void {
  const left: Box = { x: EDGE_L, y: TOP, w: 720, h: HEIGHT };
  const right: Box = {
    x: EDGE_L + 720 + GAP,
    y: TOP,
    w: EDGE_R - EDGE_L - 720 - GAP,
    h: HEIGHT,
  };
  const names =
    demo.kind === 'ai-image'
      ? demo.classes
      : demo.words.map((w) => ({ name: w.word, emoji: w.emoji }));
  const voice = demo.kind === 'ai-voice';
  const run = u - RUN_DELAY;
  const collect = clamp01((run - (COLLECT_FROM - RUN_DELAY)) / COLLECT_FOR);
  const trainStart = COLLECT_FROM - RUN_DELAY + COLLECT_FOR + 0.3;
  const train = clamp01((run - trainStart) / TRAIN_FOR);
  const testStart = trainStart + TRAIN_FOR + 0.4;

  // build the practice model as it is taught
  let model: SimModel = newModel(names.map((n) => n.name));
  const counted = Math.round(AI_EXAMPLES * ease.out3(collect));
  names.forEach((_, i) => {
    model = addExample(model, i, 'close', counted);
    if (collect > 0.4) model = addExample(model, i, 'far', 0);
    if (collect > 0.65) model = addExample(model, i, 'bright', 0);
  });

  // left: the classes and their examples
  panel(c, left.x, left.y, left.w, left.h);
  chip(
    c,
    voice ? 'TEACH IT WORDS' : 'TEACH IT EXAMPLES',
    left.x + 28,
    left.y + 22,
    { size: 24, h: 48, fill: 'rgba(255,255,255,.14)' },
  );
  const rowH = Math.min(150, (left.h - 130) / names.length);
  names.forEach((n, i) => {
    const y = left.y + 96 + i * rowH;
    pop(c, left.x + 60, y + 50, prog(u, 0.6 + i * 0.35, 0.4), () => {
      fillRR(
        c,
        left.x + 24,
        y,
        left.w - 48,
        rowH - 14,
        24,
        hexA('#ffffff', 0.1),
      );
      emoji(c, n.emoji, left.x + 84, y + (rowH - 14) / 2, 64);
      text(c, `Class: ${n.name}`, left.x + 150, y + 36, {
        size: 36,
        weight: 800,
      });
      const per = Math.min(10, counted);
      for (let j = 0; j < per; j++)
        fillRR(
          c,
          left.x + 150 + j * 44,
          y + 56,
          36,
          36,
          9,
          hexA(i % 2 ? '#34d399' : '#a78bfa', 0.9),
        );
      text(c, `${counted} examples`, left.x + left.w - 48, y + 36, {
        size: 28,
        weight: 700,
        align: 'right',
        color: '#c7d2fe',
      });
    });
  });

  // right: train, then test
  panel(c, right.x, right.y, right.w, right.h);
  chip(c, 'PRACTICE MODEL  ·  no camera is used', right.x + 28, right.y + 22, {
    size: 24,
    h: 48,
    fill: 'rgba(255,255,255,.14)',
  });
  const tx = right.x + 50;
  if (run < testStart) {
    const bw = 520;
    const bx = right.x + right.w / 2 - bw / 2;
    const by = right.y + 250;
    const pressed = prog(run, trainStart - 0.3, 0.3);
    c.save();
    c.translate(bx + bw / 2, by + 52);
    const sc =
      1 + (pressed > 0 && pressed < 1 ? Math.sin(pressed * Math.PI) * 0.1 : 0);
    c.scale(sc, sc);
    fillRR(c, -bw / 2, -52, bw, 104, 52, train > 0 ? '#16a34a' : '#8b5cf6');
    text(
      c,
      train >= 1 ? '✓  Trained!' : train > 0 ? 'Training…' : 'Train the model',
      0,
      4,
      { size: 44, weight: 900, align: 'center', base: 'middle' },
    );
    c.restore();
    fillRR(c, bx, by + 150, bw, 26, 13, 'rgba(255,255,255,.14)');
    fillRR(c, bx, by + 150, bw * train, 26, 13, '#34d399');
    text(c, 'Add examples → Train → Test', right.x + right.w / 2, by + 250, {
      size: 32,
      weight: 700,
      align: 'center',
      color: '#c7d2fe',
    });
  } else {
    const idx = Math.min(
      names.length - 1,
      Math.floor((run - testStart) / TEST_EACH),
    );
    const local = run - testStart - idx * TEST_EACH;
    const probs = predict(model, idx, voice ? 'normal' : 'close').map(
      (v) => v * (0.82 + 0.18 * ease.out3(clamp01(local / 1.2))),
    );
    const sum = probs.reduce((a, b) => a + b, 0) || 1;
    const shown = probs.map((v) => v / sum);
    const frameX = tx;
    const frameY = right.y + 150;
    text(c, voice ? 'You say…' : 'You show…', frameX, frameY - 14, {
      size: 28,
      weight: 700,
      color: '#c7d2fe',
    });
    fillRR(c, frameX, frameY, 240, 240, 28, 'rgba(255,255,255,.1)');
    strokeRR(c, frameX, frameY, 240, 240, 28, '#67e8f9', 4);
    if (voice) {
      for (let i = 0; i < 9; i++) {
        const hgt = 30 + Math.abs(Math.sin(run * 6 + i * 0.9)) * 110;
        fillRR(
          c,
          frameX + 30 + i * 21,
          frameY + 110 - hgt / 2,
          12,
          hgt,
          6,
          '#67e8f9',
        );
      }
      text(c, `“${names[idx].name}”`, frameX + 120, frameY + 210, {
        size: 34,
        weight: 800,
        align: 'center',
        color: '#fde68a',
      });
    } else {
      pop(c, frameX + 120, frameY + 120, prog(local, 0, 0.45), () =>
        emoji(c, names[idx].emoji, frameX + 120, frameY + 120, 150),
      );
    }
    text(c, 'It thinks…', frameX + 290, frameY - 14, {
      size: 28,
      weight: 700,
      color: '#c7d2fe',
    });
    drawBars(
      c,
      names,
      shown,
      frameX + 290,
      frameY + 6,
      right.w - 100 - 290,
      best(shown),
    );
    const guess = names[best(shown)];
    if (local > 1.3) {
      pop(
        c,
        right.x + right.w / 2,
        right.y + right.h - 80,
        prog(local, 1.3, 0.4),
        () => {
          fillRR(
            c,
            right.x + right.w / 2 - 360,
            right.y + right.h - 130,
            720,
            100,
            50,
            '#16a34a',
          );
          text(
            c,
            `It guesses ${guess.name} ${guess.emoji}  (${percent(shown[best(shown)])})`,
            right.x + right.w / 2,
            right.y + right.h - 78,
            { size: 40, weight: 900, align: 'center', base: 'middle' },
          );
        },
      );
    }
  }
  doneBadge(c, u, len, right.x + right.w - 30, right.y + right.h + 26);
}

// ─── Shared ─────────────────────────────────────────────────────────────────

/** "It works!" near the end of the demonstration. */
function doneBadge(c: Ctx, u: number, len: number, x: number, y: number): void {
  const p = prog(u, len - 3.1, 0.5);
  if (p <= 0) return;
  c.save();
  c.globalAlpha *= clamp01(p * 2);
  const w = 250;
  pop(c, x - w / 2, y, p, () => {
    fillRR(c, x - w, y - 26, w, 52, 26, '#16a34a');
    text(c, '✓  It works!', x - w / 2, y + 2, {
      size: 30,
      weight: 900,
      align: 'center',
      base: 'middle',
    });
  });
  c.restore();
}

export function drawDemo(
  c: Ctx,
  plan: VideoPlan,
  u: number,
  len: number,
): void {
  chip(c, 'SEE IT IN ACTION', EDGE_L, 150, {
    size: 26,
    h: 48,
    fill: linear(c, EDGE_L, 0, EDGE_L + 330, 0, [
      [0, plan.accent[0]],
      [1, plan.accent[1]],
    ]),
  });
  text(c, plan.demo.title, EDGE_L + 350, 175, {
    size: 36,
    weight: 800,
    base: 'middle',
    color: '#e0e7ff',
  });
  switch (plan.demo.kind) {
    case 'scratch-stage':
      drawStageDemo(c, plan, plan.demo, u, len);
      break;
    case 'python-run':
      drawPythonDemo(c, plan, plan.demo, u, len);
      break;
    default:
      drawAiDemo(c, plan, plan.demo, u, len);
  }
}
