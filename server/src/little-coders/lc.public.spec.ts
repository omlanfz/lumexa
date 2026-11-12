// What leaves the server about a Little Coders lesson — and what must never reach a student.

import { DEFAULT_PLATFORMS } from './lc.constants';
import { lcPatchFor } from './curriculum';
import {
  directoryOf,
  isLcLessonRow,
  readLcShared,
  readLcTeacherPrep,
  resolveButtons,
} from './lc.public';
import { isPlatformKey, platformUpdateProblems } from './lc.platforms';
import {
  isHttpsUrl,
  validateProjectCard,
  validatePreviewVideo,
  validateHomeworkCard,
  validateExperience,
} from './lc.validate';
import {
  buildSharedLesson,
  buildTeacherPrep,
  hasTeacherPrep,
  type LessonRow,
} from '../curriculum/lesson-content/serialize';

const patch = lcPatchFor(3, 2);
const directory = directoryOf(
  DEFAULT_PLATFORMS.map((p) => ({
    key: p.key,
    name: p.name,
    startUrl: p.startUrl,
    isActive: true,
  })),
);

const row = (over: Partial<LessonRow> = {}): LessonRow => ({
  id: 'lesson-1',
  title: patch.title,
  type: 'LEARNING',
  order: 11,
  duration: 60,
  objectives: patch.objectives,
  contentMarkdown: patch.contentMarkdown,
  homework: patch.homework,
  checkpoint: patch.checkpoint,
  codeSnippets: patch.codeSnippets,
  projectLinks: null,
  teacherNotes: patch.teacherNotes,
  miniQuiz: [],
  visuals: [],
  experience: patch.experience,
  previewVideo: patch.previewVideo,
  projectCard: {
    ...patch.projectCard,
    projectUrl: 'https://scratch.mit.edu/projects/99/',
    copyUrl: '',
  },
  homeworkCard: patch.homeworkCard,
  ...over,
});

describe('the shared Little Coders lesson (student, shared screen, presentation)', () => {
  const shared = buildSharedLesson(row(), { platforms: directory });

  it('carries the interactive page, the public video record and both cards', () => {
    expect(shared.littleCoders?.experience.mission.hook).toBe(
      patch.experience.mission.hook,
    );
    expect(shared.littleCoders?.previewVideo).toMatchObject({
      title: 'Your Learning Preview',
      videoUrl: '',
    });
    expect(shared.littleCoders?.projectCard?.projectUrl).toBe(
      'https://scratch.mit.edu/projects/99/',
    );
    expect(shared.littleCoders?.homeworkCard?.title).toBe(
      patch.homeworkCard.title,
    );
  });

  it('NEVER carries the video production script or the teacher instructions', () => {
    const json = JSON.stringify(shared);
    expect(shared.littleCoders?.previewVideo).not.toHaveProperty('brief');
    expect(shared.littleCoders?.projectCard).not.toHaveProperty(
      'teacherInstructions',
    );
    expect(json).not.toContain(patch.projectCard.teacherInstructions);
    for (const scene of patch.previewVideo.brief.scenes)
      expect(json).not.toContain(scene.narration);
    expect(json).not.toContain(patch.teacherNotes.slice(0, 60));
  });

  it('resolves every platform button from the platform table (the lesson never stores a start address)', () => {
    const buttons = shared.littleCoders!.projectCard!.platforms;
    expect(buttons.map((b) => [b.platform, b.label, b.url])).toEqual([
      ['TEACHABLE_MACHINE', 'Train AI Model', 'https://tm.gen-ai.fi/'],
      ['STRETCH3', 'Build in Stretch3', 'https://stretch3.github.io/'],
    ]);
    expect(JSON.stringify(patch.projectCard)).not.toMatch(/https:\/\//);
  });

  it('a platform an admin switched off comes back with no address, so the button is shown disabled', () => {
    const off = directoryOf(
      DEFAULT_PLATFORMS.map((p) => ({
        key: p.key,
        name: p.name,
        startUrl: p.startUrl,
        isActive: p.key !== 'STRETCH3',
      })),
    );
    const buttons = readLcShared(row(), off)!.projectCard!.platforms;
    expect(buttons.find((b) => b.platform === 'STRETCH3')).toMatchObject({
      url: null,
      name: expect.any(String),
    });
    expect(buttons.find((b) => b.platform === 'TEACHABLE_MACHINE')?.url).toBe(
      'https://tm.gen-ai.fi/',
    );
  });

  it('an unknown platform in the table is simply unavailable, never a crash', () => {
    expect(
      resolveButtons([{ platform: 'SCRATCH', label: 'Start' }], {}),
    ).toEqual([
      { platform: 'SCRATCH', label: 'Start', name: 'SCRATCH', url: null },
    ]);
  });

  it('a lesson whose stored page cannot be validated falls back to its text (no Little Coders block)', () => {
    const broken = buildSharedLesson(
      row({ experience: { version: 1, nonsense: true } }),
      { platforms: directory },
    );
    expect(broken.littleCoders).toBeUndefined();
    expect(broken.contentMarkdown).toContain('#');
  });

  it('every other program’s lesson is unchanged: no Little Coders key at all', () => {
    const other = buildSharedLesson(
      row({
        experience: null,
        previewVideo: null,
        projectCard: null,
        homeworkCard: null,
      }),
      {},
    );
    expect('littleCoders' in other).toBe(false);
    expect(isLcLessonRow({ experience: null })).toBe(false);
    expect(isLcLessonRow({})).toBe(false);
  });
});

describe('the staff view of a Little Coders lesson (assigned teacher, admin)', () => {
  it('has the full video script and the teacher instructions', () => {
    const prep = buildTeacherPrep(row());
    expect(prep.littleCoders?.videoBrief?.scenes).toHaveLength(6);
    expect(prep.littleCoders?.teacherInstructions).toBe(
      patch.projectCard.teacherInstructions,
    );
    expect(prep.littleCoders?.videoReady).toBe(false);
    expect(hasTeacherPrep(row())).toBe(true);
  });

  it('says when the real video has been added', () => {
    const ready = readLcTeacherPrep(
      row({
        previewVideo: {
          ...patch.previewVideo,
          videoUrl: 'https://cdn.example.org/lc/c3l2.mp4',
          durationSeconds: 92,
        },
      }),
    );
    expect(ready?.videoReady).toBe(true);
  });

  it('is absent for a lesson of another program', () => {
    expect(readLcTeacherPrep({ experience: null })).toBeNull();
    expect(
      'littleCoders' in
        buildTeacherPrep(
          row({ experience: null, previewVideo: null, projectCard: null }),
        ),
    ).toBe(false);
  });
});

describe('validation of what an admin saves', () => {
  it('accepts https addresses and refuses everything else, for the project card', () => {
    const base = { ...patch.projectCard };
    expect(
      validateProjectCard({
        ...base,
        projectUrl: 'https://scratch.mit.edu/projects/1/',
      }).value,
    ).not.toBeNull();
    expect(
      validateProjectCard({ ...base, projectUrl: '' }).value,
    ).not.toBeNull(); // empty = unavailable
    for (const bad of [
      'http://scratch.mit.edu/projects/1/',
      'javascript:alert(1)',
      'scratch.mit.edu/p/1',
      'https://a b.com',
    ]) {
      const r = validateProjectCard({ ...base, projectUrl: bad });
      expect(r.value).toBeNull();
      expect(r.errors.join(' ')).toMatch(/https/);
    }
    expect(
      validateProjectCard({ ...base, copyUrl: 'ftp://x.org/a' }).value,
    ).toBeNull();
  });

  it('the button labels and platforms are editable, but each button must name a real platform', () => {
    const base = { ...patch.projectCard };
    const ok = validateProjectCard({
      ...base,
      platforms: [{ platform: 'STRETCH3', label: 'Go to Stretch3' }],
    });
    expect(ok.value?.platforms[0].label).toBe('Go to Stretch3');
    expect(
      validateProjectCard({
        ...base,
        platforms: [{ platform: 'WORD', label: 'x' }],
      }).value,
    ).toBeNull();
    expect(validateProjectCard({ ...base, platforms: [] }).value).toBeNull();
  });

  it('a video record needs a plausible duration and https addresses', () => {
    const base = { ...patch.previewVideo };
    expect(
      validatePreviewVideo({
        ...base,
        videoUrl: 'https://cdn.example.org/a.mp4',
        durationSeconds: 90,
      }).value,
    ).not.toBeNull();
    expect(
      validatePreviewVideo({ ...base, durationSeconds: 300 }).value,
    ).toBeNull();
    expect(
      validatePreviewVideo({ ...base, videoUrl: 'file:///etc/passwd' }).value,
    ).toBeNull();
    expect(
      validatePreviewVideo({
        ...base,
        brief: { ...base.brief, targetSeconds: 30 },
      }).value,
    ).toBeNull();
  });

  it('the homework card and the experience validate as stored', () => {
    expect(validateHomeworkCard(patch.homeworkCard).value).not.toBeNull();
    expect(validateExperience(patch.experience).value).not.toBeNull();
    expect(
      validateExperience({
        ...patch.experience,
        project: { ...patch.experience.project, steps: [] },
      }).value,
    ).toBeNull();
    // A block that does not exist is refused.
    const bad = JSON.parse(JSON.stringify(patch.experience));
    bad.examples[0].lines = ['events| when the rocket launches'];
    expect(validateExperience(bad).value).toBeNull();
  });

  it('isHttpsUrl', () => {
    expect(isHttpsUrl('https://tm.gen-ai.fi/')).toBe(true);
    expect(isHttpsUrl('http://tm.gen-ai.fi/')).toBe(false);
    expect(isHttpsUrl(`https://a.org/${'x'.repeat(600)}`)).toBe(false);
  });
});

describe('platform administration', () => {
  it('knows the four platforms and their agreed start addresses', () => {
    expect(DEFAULT_PLATFORMS.map((p) => [p.key, p.startUrl])).toEqual([
      ['SCRATCH', 'https://scratch.mit.edu/projects/editor/'],
      ['STRETCH3', 'https://stretch3.github.io/'],
      ['TEACHABLE_MACHINE', 'https://tm.gen-ai.fi/'],
      ['EDUBLOCKS', 'https://app.edublocks.org/'],
    ]);
    expect(isPlatformKey('EDUBLOCKS')).toBe(true);
    expect(isPlatformKey('WORD')).toBe(false);
  });

  it('checks an admin edit', () => {
    expect(
      platformUpdateProblems({
        startUrl: 'https://example.org/start',
        name: 'Scratch',
        isActive: false,
      }),
    ).toEqual([]);
    expect(
      platformUpdateProblems({ startUrl: 'http://example.org' }).join(' '),
    ).toMatch(/https/);
    expect(platformUpdateProblems({ name: '' }).join(' ')).toMatch(/name/);
    expect(
      platformUpdateProblems({ description: 'x'.repeat(300) }).join(' '),
    ).toMatch(/200/);
  });
});
