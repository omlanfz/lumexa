// FILE PATH: server/src/little-coders/curriculum/build-lesson.ts
//
// Turns one authored LcLessonSpec into everything stored on a Lesson row: the validated
// experience, the "Your Learning Preview" video record, the project and homework cards
// (with their platform buttons — and EMPTY project addresses for an admin to fill in),
// the fallback Markdown text, the teacher notes and the plain-text code snippets.
//
// Nothing here invents a URL or a video: projectUrl / copyUrl / videoUrl / posterUrl /
// captionsUrl start empty and are managed from the admin dashboard.

import {
  DEFAULT_PLATFORM_BUTTON_LABEL,
  type LcPlatformKey,
  lcCourseBySlug,
  LC_COURSES,
} from '../lc.constants';
import type {
  LcExperience,
  LcHomeworkCard,
  LcLessonSpec,
  LcPlatformButton,
  LcPreviewVideo,
  LcProjectCard,
  LcStack,
} from '../lc.types';
import { parseLine } from '../blocks/block-dsl';
import {
  validateExperience,
  validateHomeworkCard,
  validatePreviewVideo,
  validateProjectCard,
} from '../lc.validate';

export interface LcLessonPatch {
  title: string;
  objectives: string[];
  contentMarkdown: string;
  homework: string;
  teacherNotes: string;
  checkpoint: string;
  codeSnippets: {
    label: string;
    language: string;
    code: string;
    part: string;
  }[];
  experience: LcExperience;
  previewVideo: LcPreviewVideo;
  projectCard: LcProjectCard;
  homeworkCard: LcHomeworkCard;
  /** The Project row (one per lesson): its title and one-line description. */
  project: { title: string; description: string };
}

const button = (platform: LcPlatformKey): LcPlatformButton => ({
  platform,
  label: DEFAULT_PLATFORM_BUTTON_LABEL[platform],
});

/** The coding platforms a lesson's project opens, in the order they are used. */
export function projectPlatforms(
  spec: Pick<LcLessonSpec, 'platform' | 'ai'>,
): LcPlatformKey[] {
  // AI lessons: train the model first, then build in Stretch3.
  if (spec.ai) return ['TEACHABLE_MACHINE', 'STRETCH3'];
  return [spec.platform];
}

/** Homework reuses the model trained in class, so an AI homework only opens Stretch3. */
export function homeworkPlatforms(
  spec: Pick<LcLessonSpec, 'platform' | 'ai' | 'homeworkPlatforms'>,
): LcPlatformKey[] {
  if (spec.homeworkPlatforms?.length) return spec.homeworkPlatforms;
  if (spec.ai) return ['STRETCH3'];
  return [spec.platform];
}

function projectHelper(spec: LcLessonSpec): string {
  if (spec.ai) {
    return spec.ai.kind === 'sound'
      ? 'First train and test your sound model, copy its share link, then build in Stretch3 and paste the link into the sound model block.'
      : 'First train and test your image model, copy its share link, then build in Stretch3 and paste the link into the image model block.';
  }
  if (spec.platform === 'EDUBLOCKS')
    return 'Opens a new, empty EduBlocks project in a new tab. Nothing is filled in for you.';
  return 'Opens a new, empty Scratch project in a new tab. Nothing is filled in for you.';
}

function teacherInstructions(spec: LcLessonSpec): string {
  const steps = spec.project.steps.length;
  const checks = spec.project.checklist.map((c) => `“${c}”`).join(', ');
  const where = spec.ai
    ? 'Train and test the model in Teachable Machine first. Only then open Stretch3 and paste the shareable model link.'
    : spec.platform === 'EDUBLOCKS'
      ? 'Open EduBlocks and build the blocks together. Switch to the code view to show the Python the blocks write.'
      : 'Open Scratch and build the script together, testing after every few blocks.';
  return `${where} The project has ${steps} steps. Before the end of class, check: ${checks}.`;
}

function plain(lines: string[]): string {
  return lines
    .map((raw) => {
      const p = parseLine(raw);
      return p ? `${'  '.repeat(p.depth)}${p.text}` : raw;
    })
    .join('\n');
}

function snippetsOf(stacks: LcStack[]) {
  return stacks.map((s) => ({
    label: s.title,
    language: s.language === 'scratch' ? 'scratch' : 'python',
    code: plain(s.lines),
    part: 'project',
  }));
}

/** The pieces of a lesson the plain-text fallback is built from — an authored spec or a stored experience (+ its title). */
interface FallbackSource {
  title: string;
  mission: { hook: string; objective: string };
  concepts: { title: string; text: string }[];
  project: { name: string; goal: string; steps: { text: string }[] };
  tips: { title: string; text: string; fix?: string }[];
}

/**
 * The lesson as plain Markdown. The interactive page is drawn from the stored experience; this text
 * is what older screens, search and a page whose stored data could not be read fall back to — and it
 * is rebuilt whenever an admin edits the experience (unless the admin wrote this text themselves).
 */
export function fallbackMarkdown(spec: FallbackSource): string {
  const out: string[] = [];
  out.push(`# ${spec.title}`, '', spec.mission.hook, '');
  out.push('## Your mission', '', spec.mission.objective, '');
  out.push('## Big ideas', '');
  for (const c of spec.concepts) out.push(`- **${c.title}** — ${c.text}`);
  out.push('', `## Project: ${spec.project.name}`, '', spec.project.goal, '');
  spec.project.steps.forEach((s, i) => out.push(`${i + 1}. ${s.text}`));
  out.push('', '## Tips and common mistakes', '');
  for (const t of spec.tips)
    out.push(`- **${t.title}** — ${t.text}${t.fix ? ` Fix: ${t.fix}` : ''}`);
  return out.join('\n');
}

export function homeworkMarkdown(spec: {
  homework: {
    name: string;
    instructions: string;
    deliverable: string;
    hint?: string;
  };
}): string {
  const h = spec.homework;
  return [
    `## ${h.name}`,
    '',
    h.instructions,
    '',
    `**Hand in:** ${h.deliverable}`,
    ...(h.hint ? ['', `**Hint:** ${h.hint}`] : []),
  ].join('\n');
}

/** The plain-text code snippets of a lesson's project scripts. */
export const snippetsFromStacks = snippetsOf;

function trackOf(spec: LcLessonSpec): LcExperience['track'] {
  const course = LC_COURSES.find((c) => c.number === spec.course);
  return (
    course?.track ??
    (spec.ai ? 'ai' : spec.platform === 'EDUBLOCKS' ? 'python' : 'scratch')
  );
}

/** Builds (and validates) the stored fields of one lesson. Throws with every problem listed. */
export function buildLessonPatch(spec: LcLessonSpec): LcLessonPatch {
  const experienceInput = {
    track: trackOf(spec),
    platform: spec.platform,
    courseNumber: spec.course,
    lessonNumber: spec.lesson,
    emoji: spec.emoji,
    mission: spec.mission,
    concepts: spec.concepts,
    demo: spec.demo,
    examples: spec.examples,
    tips: spec.tips,
    challenge: spec.challenge,
    ...(spec.ai ? { ai: spec.ai } : {}),
    project: spec.project,
    homework: spec.homework,
  };
  const exp = validateExperience(experienceInput);
  const label = `Course ${spec.course} lesson ${spec.lesson} (${spec.title})`;
  if (!exp.value) throw new Error(`${label}: ${exp.errors.join(' | ')}`);

  const previewInput = {
    title: 'Your Learning Preview',
    summary: spec.video.hook,
    videoUrl: '',
    posterUrl: '',
    captionsUrl: '',
    durationSeconds: null,
    brief: spec.video,
  };
  const video = validatePreviewVideo(previewInput);
  if (!video.value)
    throw new Error(`${label} video: ${video.errors.join(' | ')}`);

  const card = validateProjectCard({
    title: spec.project.name,
    projectUrl: '',
    copyUrl: '',
    openLabel: 'Open Project',
    copyLabel: 'Copy Link',
    platforms: projectPlatforms(spec).map(button),
    helper: spec.projectHelper ?? projectHelper(spec),
    teacherInstructions: teacherInstructions(spec),
  });
  if (!card.value)
    throw new Error(`${label} project card: ${card.errors.join(' | ')}`);

  const hw = validateHomeworkCard({
    title: spec.homework.name,
    instructions: spec.homework.instructions,
    deliverable: spec.homework.deliverable,
    platforms: homeworkPlatforms(spec).map(button),
    helper: spec.ai
      ? 'Use the model you trained in class — you do not need to train it again.'
      : '',
  });
  if (!hw.value)
    throw new Error(`${label} homework card: ${hw.errors.join(' | ')}`);

  const course = LC_COURSES.find((c) => c.number === spec.course)!;
  return {
    title: spec.title,
    objectives: [
      spec.mission.objective,
      `Build the “${spec.project.name}” project`,
      `Practise: ${spec.concepts
        .slice(0, 3)
        .map((c) => c.title)
        .join(', ')}`,
    ],
    contentMarkdown: fallbackMarkdown(spec),
    homework: homeworkMarkdown(spec),
    teacherNotes: spec.teacherNotes,
    checkpoint: `Finish “${spec.project.name}”`,
    codeSnippets: snippetsOf([...spec.project.stacks]),
    experience: exp.value,
    previewVideo: video.value,
    projectCard: card.value,
    homeworkCard: hw.value,
    project: {
      title: spec.project.name,
      description: `${course.title} · lesson ${spec.lesson}: ${spec.project.goal}`,
    },
  };
}

export { lcCourseBySlug };
