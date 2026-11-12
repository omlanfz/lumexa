/**
 * Produces the "Your Learning Preview" video of every Little Coders lesson — 1920×1080 MP4, about
 * 80 seconds, spoken narration, soft music, a few sound effects and synchronized English
 * subtitles — straight from the lesson specs, following the Lumexa lesson-preview production
 * template (six scenes: hook · meet the concept · explore · see it in action · remember this ·
 * your turn). Re-running it with the same inputs gives the same videos.
 *
 *   npm run lesson-videos:build                          every lesson
 *   npm run lesson-videos:build -- --lesson c1l1,c4l3    only these
 *   npm run lesson-videos:build -- --force               redo videos that already exist
 *
 * Needs: ffmpeg (FFMPEG_PATH), a Chromium (LESSON_VIDEO_CHROMIUM_PATH / puppeteer's own), and Python
 * with `pip install kokoro-onnx soundfile` plus the two Kokoro model files (see README.md).
 * Output (default server/.lesson-videos, never committed):
 *   <key>/preview.mp4  <key>/poster.jpg  <key>/captions.vtt  <key>/info.json   and   manifest.json
 */

import { spawnSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LC_LESSON_SPECS } from '../../src/little-coders/curriculum';
import {
  lessonKey,
  narrationFor,
} from '../../src/little-coders/videos/narration';
import {
  HARD_MAX_SECONDS,
  TARGET_MIN_SECONDS,
  buildTimeline,
  toWebVtt,
} from '../../src/little-coders/videos/timeline';
import {
  CHAPTER_LABELS,
  NARRATOR,
  VIDEO_CREDITS,
} from '../../src/little-coders/videos/video-keys';
import { mixLessonAudio } from './audio';
import { buildPlan } from './plan-builder';
import { ffmpegPath, launchBrowser, renderVideo, sfxFor } from './render';

const arg = (name: string, fallback = ''): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const OUT = path.resolve(
  arg(
    'out',
    process.env.LESSON_VIDEO_OUT ||
      path.join(__dirname, '../../.lesson-videos'),
  ),
);
const VOICE_DIR = path.resolve(
  arg('voice', process.env.LESSON_VIDEO_VOICE_DIR || path.join(OUT, 'voice')),
);
const MODEL_DIR =
  process.env.KOKORO_MODEL_DIR ||
  path.join(os.homedir(), '.cache', 'lumexa-tts');
const PYTHON = process.env.LESSON_VIDEO_PYTHON || 'python3';

interface Probe {
  codec: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  audioCodec: string;
  bytes: number;
  meanVolumeDb: number;
}

function probeVideo(file: string): Probe {
  const ff = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      file,
    ],
    { encoding: 'utf8' },
  );
  if (ff.status !== 0)
    throw new Error(`ffprobe failed for ${file}: ${ff.stderr}`);
  const info = JSON.parse(ff.stdout) as {
    streams: Record<string, string>[];
    format: Record<string, string>;
  };
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  if (!v || !a)
    throw new Error(`${file}: expected one video and one audio stream`);
  const [num, den] = v.r_frame_rate.split('/').map(Number);
  const vol = spawnSync(
    ffmpegPath(),
    [
      '-hide_banner',
      '-i',
      file,
      '-vn',
      '-af',
      'volumedetect',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  );
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(vol.stderr);
  return {
    codec: v.codec_name,
    width: Number(v.width),
    height: Number(v.height),
    fps: num / den,
    duration: Number(info.format.duration),
    audioCodec: a.codec_name,
    bytes: Number(info.format.size),
    meanVolumeDb: m ? Number(m[1]) : -99,
  };
}

/** The standard's checklist, as code: format, size, length and audible narration. */
export function checkProbe(key: string, p: Probe): string[] {
  const problems: string[] = [];
  if (p.codec !== 'h264')
    problems.push(`${key}: video codec is ${p.codec}, expected h264`);
  if (p.width !== 1920 || p.height !== 1080)
    problems.push(`${key}: ${p.width}×${p.height}, expected 1920×1080`);
  if (p.audioCodec !== 'aac')
    problems.push(`${key}: audio codec is ${p.audioCodec}, expected aac`);
  if (p.duration > HARD_MAX_SECONDS)
    problems.push(
      `${key}: ${p.duration.toFixed(1)} s is over the ${HARD_MAX_SECONDS} s maximum`,
    );
  if (p.duration < TARGET_MIN_SECONDS - 1)
    problems.push(
      `${key}: ${p.duration.toFixed(1)} s is under the ${TARGET_MIN_SECONDS} s target`,
    );
  if (p.meanVolumeDb < -38)
    problems.push(`${key}: the audio is nearly silent (${p.meanVolumeDb} dB)`);
  return problems;
}

function ensureNarration(keys: string[]): Record<string, number> {
  const items = LC_LESSON_SPECS.filter((s) =>
    keys.includes(lessonKey(s)),
  ).flatMap((s) => narrationFor(s).map((n) => ({ id: n.id, text: n.text })));
  fs.mkdirSync(VOICE_DIR, { recursive: true });
  const durationsFile = path.join(VOICE_DIR, 'durations.json');
  const have: Record<string, number> = fs.existsSync(durationsFile)
    ? JSON.parse(fs.readFileSync(durationsFile, 'utf8'))
    : {};
  const missing = items.filter(
    (i) =>
      have[i.id] === undefined ||
      !fs.existsSync(path.join(VOICE_DIR, `${i.id}.wav`)),
  );
  if (missing.length) {
    console.log(
      `Speaking ${missing.length} sentence(s) with ${NARRATOR.engine} (${NARRATOR.voice}, speed ${NARRATOR.speed})…`,
    );
    const jobs = path.join(VOICE_DIR, 'jobs.json');
    fs.writeFileSync(
      jobs,
      JSON.stringify(
        {
          modelDir: MODEL_DIR,
          voice: NARRATOR.voice,
          speed: NARRATOR.speed,
          outDir: VOICE_DIR,
          items: missing,
        },
        null,
        1,
      ),
    );
    const r = spawnSync(PYTHON, [path.join(__dirname, 'tts.py'), jobs], {
      stdio: 'inherit',
    });
    if (r.status !== 0)
      throw new Error(
        'The narration step failed. Is `pip install kokoro-onnx soundfile` done and KOKORO_MODEL_DIR set? See prisma/lesson-videos/README.md',
      );
  }
  return JSON.parse(fs.readFileSync(durationsFile, 'utf8')) as Record<
    string,
    number
  >;
}

const sha256 = (file: string) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
  const wanted = arg('lesson');
  const keys = wanted
    ? wanted.split(',').map((s) => s.trim())
    : LC_LESSON_SPECS.map(lessonKey);
  for (const k of keys)
    if (!LC_LESSON_SPECS.some((s) => lessonKey(s) === k))
      throw new Error(
        `There is no Little Coders lesson "${k}" (use c1l1 … c5l8).`,
      );
  const workers = Math.max(1, Number(arg('workers', '3')) || 3);
  const force = flag('force');
  fs.mkdirSync(OUT, { recursive: true });

  const durations = ensureNarration(keys);
  const browser = await launchBrowser();
  const manifestFile = path.join(OUT, 'manifest.json');
  const manifest: Record<string, unknown> = fs.existsSync(manifestFile)
    ? (JSON.parse(fs.readFileSync(manifestFile, 'utf8')).lessons ?? {})
    : {};
  const problems: string[] = [];
  const queue = [...keys];
  const started = Date.now();
  let done = 0;

  async function worker() {
    for (;;) {
      const key = queue.shift();
      if (!key) return;
      try {
        await buildOne(key);
      } catch (err) {
        // One lesson failing must not stop the others; it is reported at the end.
        problems.push(`${key}: ${(err as Error).message}`);
        console.error(`\n${key}: FAILED — ${(err as Error).message}`);
      }
    }
  }

  async function buildOne(key: string) {
    {
      const spec = LC_LESSON_SPECS.find((s) => lessonKey(s) === key)!;
      const dir = path.join(OUT, key);
      const mp4 = path.join(dir, 'preview.mp4');
      if (
        !force &&
        fs.existsSync(mp4) &&
        fs.existsSync(path.join(dir, 'info.json'))
      ) {
        manifest[key] = JSON.parse(
          fs.readFileSync(path.join(dir, 'info.json'), 'utf8'),
        );
        console.log(`${key}: already built (use --force to redo)`);
        done++;
        return;
      }
      fs.mkdirSync(dir, { recursive: true });
      const timeline = buildTimeline(spec, durations);
      for (const w of timeline.warnings) console.warn(`! ${w}`);
      const plan = buildPlan(spec, timeline);
      const sfx = await sfxFor(browser, plan);
      const wav = path.join(dir, 'mix.wav');
      const mix = mixLessonAudio({
        duration: plan.duration,
        seed: plan.seed,
        voice: timeline.cues.map((c) => ({
          start: c.start,
          file: path.join(VOICE_DIR, `${c.id}.wav`),
        })),
        sfx,
        outPath: wav,
      });
      await renderVideo({
        plan,
        browser,
        audioPath: wav,
        outPath: mp4,
        posterPath: path.join(dir, 'poster.jpg'),
        onProgress: (i, total) =>
          process.stdout.write(`\r${key}: frame ${i}/${total}   `),
      });
      process.stdout.write('\n');
      fs.writeFileSync(path.join(dir, 'captions.vtt'), toWebVtt(timeline.cues));
      fs.unlinkSync(wav);
      const probe = probeVideo(mp4);
      const found = checkProbe(key, probe);
      problems.push(...found);
      const info = {
        key,
        course: spec.course,
        lesson: spec.lesson,
        title: spec.title,
        durationSeconds: Math.round(probe.duration * 10) / 10,
        width: probe.width,
        height: probe.height,
        fps: Math.round(probe.fps),
        bytes: probe.bytes,
        sha256: sha256(mp4),
        posterSha256: sha256(path.join(dir, 'poster.jpg')),
        captionsSha256: sha256(path.join(dir, 'captions.vtt')),
        narrationWords: timeline.narrationWords,
        narrationSeconds: timeline.narrationSeconds,
        scenes: timeline.scenes.map((s) => ({
          beat: s.beat,
          start: s.start,
          end: s.end,
        })),
        chapters: timeline.scenes.map((s, i) => ({
          label: CHAPTER_LABELS[i] ?? s.beat,
          start: Math.round(s.start * 10) / 10,
        })),
        meanVolumeDb: probe.meanVolumeDb,
        mixPeak: Math.round(mix.peak * 1000) / 1000,
        credits: VIDEO_CREDITS,
        generatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(dir, 'info.json'),
        JSON.stringify(info, null, 1),
      );
      manifest[key] = info;
      done++;
      console.log(
        `${key}: ${info.durationSeconds}s, ${(probe.bytes / 1048576).toFixed(1)} MB (${done}/${keys.length}, ${Math.round((Date.now() - started) / 1000)}s elapsed)${found.length ? '  ⚠ ' + found.join('; ') : ''}`,
      );
      fs.writeFileSync(
        manifestFile,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            narrator: NARRATOR,
            credits: VIDEO_CREDITS,
            lessons: manifest,
          },
          null,
          1,
        ),
      );
    }
  }

  try {
    await Promise.all(Array.from({ length: workers }, worker));
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        narrator: NARRATOR,
        credits: VIDEO_CREDITS,
        lessons: manifest,
      },
      null,
      1,
    ),
  );
  if (problems.length) {
    console.error(
      `\n${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`\nDone: ${keys.length} video(s) in ${OUT}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
