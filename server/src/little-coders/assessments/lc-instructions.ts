// FILE PATH: server/src/little-coders/assessments/lc-instructions.ts
//
// The student-facing instructions stored on a Little Coders assessment
// (Assessment.instructions). The test screen draws the standardized header and section
// table itself; this text is what older screens and the admin page show.

import { LC_ASSESSMENT } from '../lc.constants';

export function lcAssessmentInstructions(kind: 'COURSE' | 'FINAL'): string {
  const a = LC_ASSESSMENT;
  const title = kind === 'FINAL' ? a.finalTitle : a.title;
  return [
    `${a.brand} — ${title}: ${a.minutes} minutes · ${a.marks} marks.`,
    `${a.mcq.label}: ${a.mcq.count} multiple-choice questions (${a.mcq.marks} marks, about ${a.mcq.minutes} minutes).`,
    `${a.trueFalse.label}: ${a.trueFalse.count} True/False questions (${a.trueFalse.marks} marks, about ${a.trueFalse.minutes} minutes).`,
    `${a.practical.label}: one practical coding project (${a.practical.marks} marks, about ${a.practical.minutes} minutes). Hand in your project files and/or shareable links.`,
    `${a.review.label}: about ${a.review.minutes} minutes to check your work and submit.`,
    'No marks are taken away for wrong answers. Your answers save as you go.',
  ].join('\n');
}
