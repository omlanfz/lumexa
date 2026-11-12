// Turns a lesson spec + its measured narration into the VideoPlan the renderer draws.

import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_PLATFORMS,
  LC_COURSES,
  LC_LESSONS_PER_COURSE,
} from '../../src/little-coders/lc.constants';
import type { LcLessonSpec, LcTip } from '../../src/little-coders/lc.types';
import { lessonKey } from '../../src/little-coders/videos/narration';
import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type Timeline,
} from '../../src/little-coders/videos/timeline';
import type { Track, VideoPlan } from './engine/plan';

/** One colour pair per course (the Little Coders palette, as in the curriculum PDF). */
const COURSE_ACCENTS: [string, string][] = [
  ['#F59E0B', '#FDBA4D'],
  ['#F97316', '#FDA15C'],
  ['#8B5CF6', '#C4A3FF'],
  ['#10B981', '#5FDDB0'],
  ['#0EA5E9', '#6FCBF7'],
];

const LOGO_FILE = path.resolve(
  __dirname,
  '../../../client/public/logo-mark.png',
);

let logoUri: string | null = null;
export function logoDataUri(): string {
  if (!logoUri)
    logoUri = `data:image/png;base64,${fs.readFileSync(LOGO_FILE).toString('base64')}`;
  return logoUri;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** The lesson tip that the narration of the "remember this" scene is about. */
export function pickTip(spec: LcLessonSpec): LcTip {
  const said = words(spec.video.tip);
  let best = spec.tips[0];
  let score = -1;
  for (const tip of spec.tips) {
    const mine = words(`${tip.title} ${tip.text} ${tip.fix ?? ''}`);
    let s = 0;
    for (const w of said) if (w.length > 3 && mine.has(w)) s++;
    if (s > score) {
      best = tip;
      score = s;
    }
  }
  return best;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function trackOf(spec: LcLessonSpec): Track {
  if (spec.demo.kind === 'python-run') return 'python';
  if (spec.demo.kind === 'ai-image' || spec.demo.kind === 'ai-voice')
    return 'ai';
  return 'scratch';
}

export function buildPlan(spec: LcLessonSpec, timeline: Timeline): VideoPlan {
  const course = LC_COURSES.find((c) => c.number === spec.course);
  if (!course) throw new Error(`No Little Coders course ${spec.course}`);
  const platform = DEFAULT_PLATFORMS.find((p) => p.key === spec.platform);
  const example = spec.examples[0];
  const tip = pickTip(spec);
  const ch = spec.challenge;
  const phrases = new Set<string>();
  for (const c of spec.concepts)
    phrases.add(c.title.replace(/[^\w\s’']/g, '').trim());
  for (const s of spec.video.scenes)
    phrases.add(s.onScreen.replace(/[^\w\s’']/g, '').trim());
  for (const s of spec.video.scenes)
    for (const m of s.narration.matchAll(/[“"]([^”"]{3,40})[”"]/g))
      phrases.add(m[1]);
  phrases.add(spec.project.name);

  return {
    fps: VIDEO_FPS,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    duration: timeline.duration,
    seed: hash(lessonKey(spec)) % 100000,
    accent: COURSE_ACCENTS[(spec.course - 1) % COURSE_ACCENTS.length],
    course: {
      number: spec.course,
      title: course.title,
      lessons: LC_LESSONS_PER_COURSE,
    },
    lesson: {
      number: spec.lesson,
      title: spec.title,
      emoji: spec.emoji,
      platformName: platform?.name ?? spec.platform,
      language: spec.platform === 'EDUBLOCKS' ? 'edublocks' : 'scratch',
      track: trackOf(spec),
    },
    hook: spec.video.hook,
    scenes: timeline.scenes,
    cues: timeline.cues,
    concepts: spec.concepts.map((c) => ({
      emoji: c.emoji,
      title: c.title,
      text: c.text,
    })),
    example: {
      title: example.title,
      lines: example.lines,
      language: example.language,
    },
    demo: spec.demo,
    tip: { kind: tip.kind, title: tip.title, text: tip.text, fix: tip.fix },
    challenge:
      ch.kind === 'choose'
        ? {
            kind: 'choose',
            prompt: ch.prompt,
            options: ch.options,
            lines: [],
            language: ch.code?.language ?? example.language,
          }
        : {
            kind: 'order',
            prompt: ch.prompt,
            options: [],
            lines: ch.lines,
            language: ch.language,
          },
    project: { name: spec.project.name },
    highlights: [...phrases].filter((p) => p.length >= 3),
    logo: logoDataUri(),
  };
}
