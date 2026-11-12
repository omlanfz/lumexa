// Draws a handful of still frames of a lesson video (no audio, no encoding) so the animation can be
// checked quickly:   ts-node prisma/lesson-videos/preview.ts --lesson c1l1 --voice <dir> --out <dir>

import * as fs from 'fs';
import * as path from 'path';
import { LC_LESSON_SPECS } from '../../src/little-coders/curriculum';
import { lessonKey } from '../../src/little-coders/videos/narration';
import { buildTimeline } from '../../src/little-coders/videos/timeline';
import { buildPlan } from './plan-builder';
import { frameAt, launchBrowser } from './render';

const arg = (name: string, fallback = ''): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

async function main() {
  const wanted = arg('lesson', 'c1l1') || 'c1l1';
  const keys = wanted === 'all' ? LC_LESSON_SPECS.map(lessonKey) : wanted.split(',');
  const voice = arg('voice');
  const out = arg('out', '.');
  fs.mkdirSync(out, { recursive: true });
  const durations = JSON.parse(fs.readFileSync(path.join(voice, 'durations.json'), 'utf8')) as Record<string, number>;
  const browser = await launchBrowser();
  try {
    for (const key of keys) {
      const spec = LC_LESSON_SPECS.find((s) => lessonKey(s) === key);
      if (!spec) throw new Error(`No lesson ${key}`);
      const timeline = buildTimeline(spec, durations);
      const plan = buildPlan(spec, timeline);
      const s = plan.scenes;
      const picks: [string, number][] = [
        ['1-hook', s[0].start + 4],
        ['2-intro', s[1].start + 7.5],
        ['3a-explain', s[2].start + 3],
        ['3b-explain', s[2].start + 9],
        ['3c-explain', s[2].start + 18],
        ['4a-demo', s[3].start + 3],
        ['4b-demo', s[3].start + 8],
        ['4c-demo', s[3].start + 13.5],
        ['5-tip', s[4].start + 5],
        ['6a-turn', s[5].start + 6],
        ['6b-end', s[5].end - 1.2],
      ];
      const frames = await frameAt(browser, plan, picks.map((p) => p[1]), 0.92);
      frames.forEach((buf, i) => fs.writeFileSync(path.join(out, `${key}-${picks[i][0]}.jpg`), buf));
      console.log(`${key}: ${plan.duration}s, ${plan.cues.length} subtitles, ${frames.length} frames → ${out}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
