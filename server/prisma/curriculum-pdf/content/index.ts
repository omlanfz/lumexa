// The eight programs with a downloadable curriculum PDF, in the order the website lists them.

import type { ProgramContent } from '../types';
import { ADVANCED_DATA_SCIENCE } from './advanced-data-science';
import { AI_BUILDER } from './ai-builder';
import { DATA_SCIENTIST } from './data-scientist';
import { DIGITAL_INDEPENDENCE } from './digital-independence';
import { GAME_CREATOR } from './game-creator';
import { LITTLE_CODERS } from './little-coders';
import { ODYSSEY } from './odyssey';
import { WEB_DEVELOPER } from './web-developer';

export const PROGRAMS: ProgramContent[] = [
  ODYSSEY,
  LITTLE_CODERS,
  GAME_CREATOR,
  AI_BUILDER,
  WEB_DEVELOPER,
  DATA_SCIENTIST,
  ADVANCED_DATA_SCIENCE,
  DIGITAL_INDEPENDENCE,
];

/** Everything wrong with a program's content, as readable lines (empty = fine). */
export function problemsWith(p: ProgramContent): string[] {
  const out: string[] = [];
  const at = (msg: string) => out.push(`${p.slug}: ${msg}`);
  if (p.courses.length < 3) at('has fewer than 3 courses');
  if (p.stages) {
    const covered = p.stages
      .flatMap((s) => s.courseIndexes)
      .sort((a, b) => a - b);
    if (covered.join() !== p.courses.map((_, i) => i).join())
      at('the stages must cover every course exactly once, in order');
    if (!p.assessments.stageTest)
      at('a program with stages needs a stage test');
  } else if (p.assessments.stageTest) {
    at('only a program with stages has a stage test');
  }
  p.courses.forEach((c, i) => {
    const w = `course ${i + 1} (${c.title})`;
    if (c.lessons.length !== 8)
      at(`${w} has ${c.lessons.length} lessons, expected 8`);
    if (c.snapshots.length < 1 || c.snapshots.length > 2)
      at(`${w} needs 1–2 sample project pictures`);
    if (!c.tools.length) at(`${w} has no tools`);
    if (!p.stages) {
      if (c.projects.length < 3) at(`${w} needs at least 3 portfolio projects`);
      for (const f of [
        'overview',
        'why',
        'snapshotNote',
        'teaser',
        'subtitle',
      ] as const)
        if (!c[f].trim()) at(`${w} has an empty ${f}`);
    }
    if (!c.testTitle.trim()) at(`${w} has no test title`);
  });
  if (p.journeyProjects.length !== p.courses.length)
    at('journeyProjects must have one entry per course');
  if (p.stats.length !== 3)
    at(
      'stats must list courses, lessons and sessions (the age range is added from the program facts)',
    );
  if (p.highlights.length !== 3) at('needs exactly 3 highlights');
  if (p.outcomes.length !== 3) at('needs exactly 3 outcomes');
  return out;
}
