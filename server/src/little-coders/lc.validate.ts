// FILE PATH: server/src/little-coders/lc.validate.ts
//
// Validation and normalisation of everything a Little Coders lesson stores as JSON, and
// of an assessment's practical project. Used three ways:
//   * by the tests, over every authored lesson and assessment;
//   * by the admin save endpoints, which reject a save with the full list of problems;
//   * by the read path, which never serves a stored value that fails (so a row edited by
//     hand can never put markup, a broken button or an invented block in front of a child).
//
// Text limits are deliberate: the lessons are meant to be short, visual and friendly for
// ages 6–11, so a paragraph does not fit.

import { LC_PLATFORM_KEYS, LC_VARIANTS, type LcPlatformKey } from './lc.constants';
import {
  type LcAiPlan,
  type LcChallenge,
  type LcDemo,
  type LcExperience,
  type LcHomeworkCard,
  type LcPlatformButton,
  type LcPracticalSpec,
  type LcPreviewVideo,
  type LcPreviewVideoPublic,
  type LcProjectCard,
  type LcProjectCardPublic,
  type LcStack,
} from './lc.types';
import { toolboxOf, validateLines } from './blocks/block-dsl';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

/** Collects problems with a readable path. */
class Check {
  readonly errors: string[] = [];
  constructor(private readonly root: string) {}
  fail(path: string, message: string) {
    this.errors.push(`${this.root}${path ? ` › ${path}` : ''}: ${message}`);
  }
  str(v: unknown, path: string, max: number, opts: { min?: number; optional?: boolean } = {}): string {
    if (v === undefined || v === null) {
      if (!opts.optional) this.fail(path, 'is required');
      return '';
    }
    if (typeof v !== 'string') {
      this.fail(path, 'must be text');
      return '';
    }
    const t = v.trim();
    if (t.length < (opts.min ?? (opts.optional ? 0 : 1))) this.fail(path, 'is required');
    if (t.length > max) this.fail(path, `is too long (${t.length} > ${max} characters)`);
    return t;
  }
  arr(v: unknown, path: string, min: number, max: number): unknown[] {
    if (!Array.isArray(v)) {
      this.fail(path, 'must be a list');
      return [];
    }
    if (v.length < min || v.length > max) this.fail(path, `needs ${min === max ? min : `${min}–${max}`} item(s), has ${v.length}`);
    return v;
  }
  obj(v: unknown, path: string): Obj {
    if (!isObj(v)) {
      this.fail(path, 'must be an object');
      return {};
    }
    return v;
  }
}

export function isHttpsUrl(v: string): boolean {
  if (v.length > 500) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !!u.hostname && !/\s/.test(v);
  } catch {
    return false;
  }
}

function urlField(c: Check, v: unknown, path: string): string {
  const t = c.str(v, path, 500, { optional: true });
  if (t && !isHttpsUrl(t)) c.fail(path, 'must be a full https:// address (or left empty)');
  return t;
}

// ─── Stacks ─────────────────────────────────────────────────────────────────

function readStack(c: Check, v: unknown, path: string): LcStack {
  const o = c.obj(v, path);
  const language = o.language === 'scratch' || o.language === 'edublocks' ? o.language : 'scratch';
  if (o.language !== 'scratch' && o.language !== 'edublocks') c.fail(`${path}.language`, 'must be "scratch" or "edublocks"');
  const lines = c.arr(o.lines, `${path}.lines`, 1, 22).map((l, i) => {
    if (typeof l !== 'string') {
      c.fail(`${path}.lines[${i}]`, 'must be text');
      return '';
    }
    return l.replace(/\s+$/, '');
  });
  for (const p of validateLines(language, lines, path)) c.fail('', p);
  const notes: Record<string, string> = {};
  if (o.notes !== undefined) {
    for (const [k, n] of Object.entries(c.obj(o.notes, `${path}.notes`))) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 1 || idx > lines.length) c.fail(`${path}.notes.${k}`, 'does not point at a line of the script');
      notes[k] = c.str(n, `${path}.notes.${k}`, 160);
    }
  }
  const stack: LcStack = {
    id: c.str(o.id, `${path}.id`, 40),
    title: c.str(o.title, `${path}.title`, 80),
    language,
    lines,
  };
  const intro = c.str(o.intro, `${path}.intro`, 160, { optional: true });
  if (intro) stack.intro = intro;
  const sprite = c.str(o.sprite, `${path}.sprite`, 40, { optional: true });
  if (sprite) stack.sprite = sprite;
  if (Object.keys(notes).length) stack.notes = notes;
  return stack;
}

// ─── Demos and challenges ───────────────────────────────────────────────────

function readDemo(c: Check, v: unknown, path: string): LcDemo | null {
  const o = c.obj(v, path);
  const title = c.str(o.title, `${path}.title`, 80);
  const intro = c.str(o.intro, `${path}.intro`, 200);
  const hint = c.str(o.hint, `${path}.hint`, 160, { optional: true });
  switch (o.kind) {
    case 'scratch-stage': {
      const sprites = c.arr(o.sprites, `${path}.sprites`, 1, 5).map((s, i) => {
        const so = c.obj(s, `${path}.sprites[${i}]`);
        return {
          id: c.str(so.id, `${path}.sprites[${i}].id`, 30),
          emoji: c.str(so.emoji, `${path}.sprites[${i}].emoji`, 8),
          label: c.str(so.label, `${path}.sprites[${i}].label`, 40),
          ...(typeof so.x === 'number' ? { x: so.x } : {}),
          ...(typeof so.y === 'number' ? { y: so.y } : {}),
          ...(Array.isArray(so.costumes) ? { costumes: so.costumes.filter((x): x is string => typeof x === 'string').slice(0, 6) } : {}),
        };
      });
      const ids = new Set(sprites.map((s) => s.id));
      const scripts = c.arr(o.scripts, `${path}.scripts`, 1, 6).map((s, i) => {
        const so = c.obj(s, `${path}.scripts[${i}]`);
        const lines = c.arr(so.lines, `${path}.scripts[${i}].lines`, 1, 16).map((l) => String(l));
        for (const p of validateLines('scratch', lines, `${path}.scripts[${i}]`)) c.fail('', p);
        const sprite = c.str(so.sprite, `${path}.scripts[${i}].sprite`, 30);
        if (sprite && !ids.has(sprite)) c.fail(`${path}.scripts[${i}].sprite`, `"${sprite}" is not one of the demo's sprites`);
        return { sprite, lines };
      });
      const backdrop = ['space', 'sky', 'grass', 'night', 'plain'].includes(String(o.backdrop)) ? (o.backdrop as 'space') : undefined;
      const keys = Array.isArray(o.keys) ? o.keys.filter((k): k is string => typeof k === 'string').slice(0, 6) : undefined;
      return { kind: 'scratch-stage', title, intro, sprites, scripts, ...(backdrop ? { backdrop } : {}), ...(keys?.length ? { keys } : {}), ...(hint ? { hint } : {}) };
    }
    case 'python-run': {
      const lines = c.arr(o.lines, `${path}.lines`, 1, 22).map((l) => String(l));
      for (const p of validateLines('edublocks', lines, path)) c.fail('', p);
      const inputs = Array.isArray(o.inputs) ? o.inputs.filter((x): x is string => typeof x === 'string').slice(0, 6) : undefined;
      return { kind: 'python-run', title, intro, lines, ...(inputs?.length ? { inputs } : {}), ...(o.expectError === true ? { expectError: true } : {}), ...(hint ? { hint } : {}) };
    }
    case 'ai-image': {
      const classes = c.arr(o.classes, `${path}.classes`, 3, 4).map((k, i) => {
        const ko = c.obj(k, `${path}.classes[${i}]`);
        return { name: c.str(ko.name, `${path}.classes[${i}].name`, 30), emoji: c.str(ko.emoji, `${path}.classes[${i}].emoji`, 8) };
      });
      const mode = o.mode === 'improve' || o.mode === 'events' ? o.mode : 'basic';
      return { kind: 'ai-image', title, intro, classes, mode, ...(hint ? { hint } : {}) };
    }
    case 'ai-voice': {
      const words = c.arr(o.words, `${path}.words`, 3, 4).map((k, i) => {
        const ko = c.obj(k, `${path}.words[${i}]`);
        return { word: c.str(ko.word, `${path}.words[${i}].word`, 20), emoji: c.str(ko.emoji, `${path}.words[${i}].emoji`, 8) };
      });
      const mode = o.mode === 'events' || o.mode === 'quiz' ? o.mode : 'basic';
      return { kind: 'ai-voice', title, intro, words, mode, ...(hint ? { hint } : {}) };
    }
    default:
      c.fail(`${path}.kind`, 'must be scratch-stage, python-run, ai-image or ai-voice');
      return null;
  }
}

function readChallenge(c: Check, v: unknown, path: string): LcChallenge | null {
  const o = c.obj(v, path);
  const prompt = c.str(o.prompt, `${path}.prompt`, 200);
  const hint = c.str(o.hint, `${path}.hint`, 200);
  const explain = c.str(o.explain, `${path}.explain`, 260);
  if (o.kind === 'choose') {
    const options = c.arr(o.options, `${path}.options`, 2, 4).map((x, i) => c.str(x, `${path}.options[${i}]`, 120));
    const answer = typeof o.answer === 'number' && Number.isInteger(o.answer) ? o.answer : -1;
    if (answer < 0 || answer >= options.length) c.fail(`${path}.answer`, 'must point at one of the options');
    let code: { language: 'scratch' | 'edublocks'; lines: string[] } | undefined;
    if (o.code !== undefined) {
      const co = c.obj(o.code, `${path}.code`);
      const language = co.language === 'edublocks' ? 'edublocks' : 'scratch';
      const lines = c.arr(co.lines, `${path}.code.lines`, 1, 14).map((l) => String(l));
      for (const p of validateLines(language, lines, `${path}.code`)) c.fail('', p);
      code = { language, lines };
    }
    return { kind: 'choose', prompt, ...(code ? { code } : {}), options, answer, hint, explain };
  }
  if (o.kind === 'order') {
    const language = o.language === 'edublocks' ? 'edublocks' : 'scratch';
    const lines = c.arr(o.lines, `${path}.lines`, 3, 6).map((l) => String(l));
    for (const p of validateLines(language, lines, path)) c.fail('', p);
    if (lines.some((l) => /^ /.test(l))) c.fail(`${path}.lines`, 'ordering blocks must all be at the top level (no indent)');
    if (new Set(lines).size !== lines.length) c.fail(`${path}.lines`, 'blocks to order must all be different');
    return { kind: 'order', prompt, language, lines, hint, explain };
  }
  c.fail(`${path}.kind`, 'must be "choose" or "order"');
  return null;
}

function readAi(c: Check, v: unknown, path: string): LcAiPlan {
  const o = c.obj(v, path);
  const kind = o.kind === 'sound' ? 'sound' : 'image';
  const classes = c.arr(o.classes, `${path}.classes`, 3, 3).map((k, i) => {
    const ko = c.obj(k, `${path}.classes[${i}]`);
    const minExamples = typeof ko.minExamples === 'number' ? ko.minExamples : 0;
    if (minExamples < 5 || minExamples > 100) c.fail(`${path}.classes[${i}].minExamples`, 'must be between 5 and 100');
    return {
      name: c.str(ko.name, `${path}.classes[${i}].name`, 30),
      emoji: c.str(ko.emoji, `${path}.classes[${i}].emoji`, 8),
      collect: c.str(ko.collect, `${path}.classes[${i}].collect`, 160),
      minExamples,
    };
  });
  const list = (key: string, min: number, max: number, maxLen: number) =>
    c.arr(o[key], `${path}.${key}`, min, max).map((x, i) => c.str(x, `${path}.${key}[${i}]`, maxLen));
  return {
    kind,
    classes,
    background: o.background === true,
    collectTips: list('collectTips', 2, 5, 160),
    testSteps: list('testSteps', 2, 5, 160),
    exportSteps: list('exportSteps', 2, 6, 180),
    connectSteps: list('connectSteps', 3, 8, 200),
  };
}

// ─── The experience ─────────────────────────────────────────────────────────

export interface Validated<T> {
  errors: string[];
  value: T | null;
}

export function validateExperience(raw: unknown): Validated<LcExperience> {
  const c = new Check('experience');
  if (!isObj(raw)) return { errors: ['experience: must be an object'], value: null };
  const o = raw;
  const track = o.track === 'scratch' || o.track === 'ai' || o.track === 'python' ? o.track : null;
  if (!track) c.fail('track', 'must be scratch, ai or python');
  const platform = LC_PLATFORM_KEYS.includes(o.platform as LcPlatformKey) ? (o.platform as LcPlatformKey) : null;
  if (!platform) c.fail('platform', 'is not a known coding platform');
  const mission = c.obj(o.mission, 'mission');
  const concepts = c.arr(o.concepts, 'concepts', 3, 4).map((k, i) => {
    const ko = c.obj(k, `concepts[${i}]`);
    return {
      emoji: c.str(ko.emoji, `concepts[${i}].emoji`, 8),
      title: c.str(ko.title, `concepts[${i}].title`, 50),
      text: c.str(ko.text, `concepts[${i}].text`, 180),
      reveal: c.str(ko.reveal, `concepts[${i}].reveal`, 280),
    };
  });
  const demo = readDemo(c, o.demo, 'demo');
  const examples = c.arr(o.examples, 'examples', 1, 3).map((s, i) => readStack(c, s, `examples[${i}]`));
  const tips = c.arr(o.tips, 'tips', 2, 4).map((t, i) => {
    const to = c.obj(t, `tips[${i}]`);
    const kind = to.kind === 'mistake' ? 'mistake' : 'tip';
    const fix = c.str(to.fix, `tips[${i}].fix`, 200, { optional: true });
    if (kind === 'mistake' && !fix) c.fail(`tips[${i}].fix`, 'a common mistake needs a fix');
    return { kind, title: c.str(to.title, `tips[${i}].title`, 60), text: c.str(to.text, `tips[${i}].text`, 200), ...(fix ? { fix } : {}) } as LcExperience['tips'][number];
  });
  if (!tips.some((t) => t.kind === 'mistake')) c.fail('tips', 'include at least one common mistake');
  const challenge = readChallenge(c, o.challenge, 'challenge');

  const po = c.obj(o.project, 'project');
  const stacks = c.arr(po.stacks, 'project.stacks', 1, 4).map((s, i) => readStack(c, s, `project.stacks[${i}]`));
  const stackIds = new Set(stacks.map((s) => s.id));
  const steps = c.arr(po.steps, 'project.steps', 4, 10).map((s, i) => {
    const so = c.obj(s, `project.steps[${i}]`);
    const stack = c.str(so.stack, `project.steps[${i}].stack`, 40, { optional: true });
    if (stack && !stackIds.has(stack)) c.fail(`project.steps[${i}].stack`, `"${stack}" is not one of the project's scripts`);
    return { text: c.str(so.text, `project.steps[${i}].text`, 220), ...(stack ? { stack } : {}) };
  });
  const assets = Array.isArray(po.assets)
    ? po.assets.slice(0, 8).map((a, i) => {
        const ao = c.obj(a, `project.assets[${i}]`);
        const costumes = Array.isArray(ao.costumes) ? ao.costumes.filter((x): x is string => typeof x === 'string').slice(0, 8) : undefined;
        const note = c.str(ao.note, `project.assets[${i}].note`, 120, { optional: true });
        return { name: c.str(ao.name, `project.assets[${i}].name`, 40), ...(costumes?.length ? { costumes } : {}), ...(note ? { note } : {}) };
      })
    : undefined;
  const stretch = c.str(po.stretch, 'project.stretch', 220, { optional: true });
  const project = {
    name: c.str(po.name, 'project.name', 60),
    goal: c.str(po.goal, 'project.goal', 220),
    ...(assets?.length ? { assets } : {}),
    steps,
    stacks,
    checklist: c.arr(po.checklist, 'project.checklist', 3, 6).map((x, i) => c.str(x, `project.checklist[${i}]`, 120)),
    ...(stretch ? { stretch } : {}),
  };
  const ho = c.obj(o.homework, 'homework');
  const hwStack = ho.stack !== undefined ? readStack(c, ho.stack, 'homework.stack') : undefined;
  const homework = {
    name: c.str(ho.name, 'homework.name', 60),
    instructions: c.str(ho.instructions, 'homework.instructions', 360),
    deliverable: c.str(ho.deliverable, 'homework.deliverable', 160),
    ...(c.str(ho.hint, 'homework.hint', 200, { optional: true }) ? { hint: c.str(ho.hint, 'homework.hint', 200, { optional: true }) } : {}),
    ...(hwStack ? { stack: hwStack } : {}),
  };
  const ai = o.ai !== undefined ? readAi(c, o.ai, 'ai') : undefined;
  if (track === 'ai' && !ai) c.fail('ai', 'an AI lesson needs its training plan');

  if (c.errors.length > 0 || !track || !platform || !demo || !challenge) return { errors: c.errors, value: null };
  const toolbox = toolboxOf([...examples, ...stacks]);
  const value: LcExperience = {
    version: 1,
    track,
    platform,
    courseNumber: Number(o.courseNumber) || 0,
    lessonNumber: Number(o.lessonNumber) || 0,
    emoji: c.str(o.emoji, 'emoji', 8),
    mission: {
      hook: c.str(mission.hook, 'mission.hook', 160),
      objective: c.str(mission.objective, 'mission.objective', 180),
      badge: c.str(mission.badge, 'mission.badge', 40),
    },
    concepts,
    demo,
    examples,
    toolbox,
    tips,
    challenge,
    ...(ai ? { ai } : {}),
    project,
    homework,
  };
  return { errors: c.errors, value: c.errors.length ? null : value };
}

// ─── Buttons, cards, video ──────────────────────────────────────────────────

function readButtons(c: Check, v: unknown, path: string): LcPlatformButton[] {
  return c.arr(v, path, 1, 3).map((b, i) => {
    const bo = c.obj(b, `${path}[${i}]`);
    const platform = LC_PLATFORM_KEYS.includes(bo.platform as LcPlatformKey) ? (bo.platform as LcPlatformKey) : null;
    if (!platform) c.fail(`${path}[${i}].platform`, 'is not a known coding platform');
    return { platform: platform ?? 'SCRATCH', label: c.str(bo.label, `${path}[${i}].label`, 40) };
  });
}

export function validateProjectCard(raw: unknown): Validated<LcProjectCard> {
  const c = new Check('projectCard');
  const o = c.obj(raw, '');
  const value: LcProjectCard = {
    title: c.str(o.title, 'title', 80),
    projectUrl: urlField(c, o.projectUrl, 'projectUrl'),
    copyUrl: urlField(c, o.copyUrl, 'copyUrl'),
    openLabel: c.str(o.openLabel ?? 'Open Project', 'openLabel', 40),
    copyLabel: c.str(o.copyLabel ?? 'Copy Link', 'copyLabel', 40),
    platforms: readButtons(c, o.platforms, 'platforms'),
    helper: c.str(o.helper, 'helper', 200, { optional: true }),
    teacherInstructions: c.str(o.teacherInstructions, 'teacherInstructions', 1200, { optional: true }),
  };
  return { errors: c.errors, value: c.errors.length ? null : value };
}

export function validateHomeworkCard(raw: unknown): Validated<LcHomeworkCard> {
  const c = new Check('homeworkCard');
  const o = c.obj(raw, '');
  const value: LcHomeworkCard = {
    title: c.str(o.title, 'title', 80),
    instructions: c.str(o.instructions, 'instructions', 400),
    deliverable: c.str(o.deliverable, 'deliverable', 160),
    platforms: readButtons(c, o.platforms, 'platforms'),
    helper: c.str(o.helper, 'helper', 200, { optional: true }),
  };
  return { errors: c.errors, value: c.errors.length ? null : value };
}

const SCENE_TIME = /^\d:\d{2}–\d:\d{2}$/;

export function validatePreviewVideo(raw: unknown): Validated<LcPreviewVideo> {
  const c = new Check('previewVideo');
  const o = c.obj(raw, '');
  const bo = c.obj(o.brief, 'brief');
  const scenes = c.arr(bo.scenes, 'brief.scenes', 6, 8).map((s, i) => {
    const so = c.obj(s, `brief.scenes[${i}]`);
    const time = c.str(so.time, `brief.scenes[${i}].time`, 12);
    if (time && !SCENE_TIME.test(time)) c.fail(`brief.scenes[${i}].time`, 'must look like 0:08–0:20');
    return {
      time,
      beat: c.str(so.beat, `brief.scenes[${i}].beat`, 40),
      visual: c.str(so.visual, `brief.scenes[${i}].visual`, 300),
      narration: c.str(so.narration, `brief.scenes[${i}].narration`, 320),
      onScreen: c.str(so.onScreen, `brief.scenes[${i}].onScreen`, 120),
    };
  });
  const target = typeof bo.targetSeconds === 'number' ? bo.targetSeconds : 0;
  if (target < 60 || target > 120) c.fail('brief.targetSeconds', 'must be between 60 and 120 seconds');
  const duration = o.durationSeconds === null || o.durationSeconds === undefined || o.durationSeconds === '' ? null : Number(o.durationSeconds);
  if (duration !== null && (!Number.isFinite(duration) || duration < 1 || duration > 120)) c.fail('durationSeconds', 'must be between 1 and 120 seconds');
  const value: LcPreviewVideo = {
    title: c.str(o.title, 'title', 80),
    summary: c.str(o.summary, 'summary', 200),
    videoUrl: urlField(c, o.videoUrl, 'videoUrl'),
    posterUrl: urlField(c, o.posterUrl, 'posterUrl'),
    captionsUrl: urlField(c, o.captionsUrl, 'captionsUrl'),
    durationSeconds: duration,
    brief: {
      title: c.str(bo.title, 'brief.title', 100),
      hook: c.str(bo.hook, 'brief.hook', 200),
      targetSeconds: target,
      scenes,
      tip: c.str(bo.tip, 'brief.tip', 240),
      challenge: c.str(bo.challenge, 'brief.challenge', 240),
      leadsInto: c.str(bo.leadsInto, 'brief.leadsInto', 200),
    },
  };
  return { errors: c.errors, value: c.errors.length ? null : value };
}

/** What a student receives: the address, poster and subtitles — never the production brief. */
export function publicVideo(v: LcPreviewVideo): LcPreviewVideoPublic {
  return {
    title: v.title,
    summary: v.summary,
    videoUrl: v.videoUrl,
    posterUrl: v.posterUrl,
    captionsUrl: v.captionsUrl,
    durationSeconds: v.durationSeconds,
  };
}

export function publicProjectCard(card: LcProjectCard): LcProjectCardPublic {
  const { teacherInstructions: _staffOnly, ...rest } = card;
  void _staffOnly;
  return rest;
}

/** Narration words of a brief — the target is about 100–130 for a 90-second video. */
export function narrationWords(v: { brief: { scenes: { narration: string }[] } }): number {
  return v.brief.scenes.reduce((n, s) => n + s.narration.split(/\s+/).filter(Boolean).length, 0);
}

// ─── Assessment practical ───────────────────────────────────────────────────

export function validatePracticalSpec(raw: unknown): Validated<LcPracticalSpec> {
  const c = new Check('practical');
  const o = c.obj(raw, '');
  const platform = LC_PLATFORM_KEYS.includes(o.platform as LcPlatformKey) ? (o.platform as LcPlatformKey) : null;
  if (!platform) c.fail('platform', 'is not a known coding platform');
  else if (platform !== 'STRETCH3' && platform !== 'EDUBLOCKS') c.fail('platform', 'a Little Coders practical is built in Stretch3 or EduBlocks');
  const variant = o.variant === null || o.variant === undefined ? null : LC_VARIANTS.includes(o.variant as never) ? (o.variant as LcPracticalSpec['variant']) : (c.fail('variant', 'must be SCRATCH_AI or PYTHON'), null);
  const so = c.obj(o.starter, 'starter');
  const kind = so.kind === 'MODEL_URL' || so.kind === 'PROJECT_URL' ? so.kind : 'NONE';
  const starter = {
    required: so.required === true,
    kind: kind as 'NONE' | 'MODEL_URL' | 'PROJECT_URL',
    label: c.str(so.label, 'starter.label', 80, { optional: true }),
    url: urlField(c, so.url, 'starter.url'),
    note: c.str(so.note, 'starter.note', 300, { optional: true }),
    modelLabels: Array.isArray(so.modelLabels) ? so.modelLabels.filter((x): x is string => typeof x === 'string').slice(0, 6) : [],
  };
  if (starter.required && starter.kind === 'NONE') c.fail('starter.kind', 'a required starter needs a kind (MODEL_URL or PROJECT_URL)');
  const blocks = c.arr(o.blocks, 'blocks', 2, 8).map((g, i) => {
    const go = c.obj(g, `blocks[${i}]`);
    return {
      category: c.str(go.category, `blocks[${i}].category`, 40),
      blocks: c.arr(go.blocks, `blocks[${i}].blocks`, 1, 12).map((x, j) => c.str(x, `blocks[${i}].blocks[${j}]`, 90)),
    };
  });
  const value: LcPracticalSpec = {
    version: 1,
    platform: platform ?? 'STRETCH3',
    variant,
    minutes: typeof o.minutes === 'number' ? o.minutes : 20,
    brief: c.arr(o.brief, 'brief', 2, 5).map((x, i) => c.str(x, `brief[${i}]`, 320)),
    blocks,
    requirements: c.arr(o.requirements, 'requirements', 4, 10).map((x, i) => c.str(x, `requirements[${i}]`, 240)),
    starter,
    bonus: Array.isArray(o.bonus) ? o.bonus.slice(0, 3).map((x, i) => c.str(x, `bonus[${i}]`, 200)) : [],
    handIn: c.str(o.handIn, 'handIn', 300),
    ...(o.adminEdited === true ? { adminEdited: true } : {}),
  };
  return { errors: c.errors, value: c.errors.length ? null : value };
}
