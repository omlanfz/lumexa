/**
 * Puts the finished lesson videos (see build.ts) into the lesson-video bucket and shows them on their
 * lessons. It uses exactly the code the admin "Upload video" button uses, so every file is checked
 * (a real MP4, 16:9, 10–120 s, a JPEG poster, WebVTT subtitles) before anything is stored.
 *
 *   npm run lesson-videos:upload                       every built lesson
 *   npm run lesson-videos:upload -- --lesson c1l1,c2l3 only these
 *   npm run lesson-videos:upload -- --dir <folder>     read the built videos from <folder> (default server/.lesson-videos)
 *   npm run lesson-videos:upload -- --dry-run          check the files and say what would happen; touch nothing
 *   npm run lesson-videos:upload -- --no-db            only put the files in the bucket (no database needed): the server finds
 *                                                      them there on its next start, or press "Check storage" in the admin editor
 *   npm run lesson-videos:upload -- --replace          also replace a video a lesson already has (default: keep it)
 *   npm run lesson-videos:upload -- --stage <folder>   no network, no database: write the files into <folder> with
 *                                                      the exact names the bucket needs, to copy over with rclone /
 *                                                      `aws s3 sync` / the Cloudflare dashboard
 *
 * Needs the LESSON_VIDEO_R2_* settings (server/.env or the environment) — see docs/LESSON_VIDEOS_SETUP.md —
 * and, unless --no-db / --dry-run / --stage, DATABASE_URL.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LC_LESSON_SPECS } from '../../src/little-coders/curriculum';
import { PrismaService } from '../../src/prisma.service';
import type { PublishedVideo } from '../../src/little-coders/videos/published-video';
import {
  LC_VIDEO_PROGRAM_KEY,
  LessonVideosService,
  orderOfLessonKey,
} from '../../src/little-coders/videos/lesson-videos.service';
import {
  LessonVideoStorageService,
  describeStorageError,
} from '../../src/little-coders/videos/lesson-video-storage.service';
import {
  looksLikeJpeg,
  looksLikeMp4,
  looksLikeWebVtt,
  probeMp4,
} from '../../src/little-coders/videos/mp4';
import { lessonKey } from '../../src/little-coders/videos/narration';
import {
  CONTENT_TYPE,
  lessonVideoKey,
} from '../../src/little-coders/videos/video-keys';
import { validatePreviewVideo } from '../../src/little-coders/lc.validate';
import * as crypto from 'crypto';

const arg = (name: string, fallback = ''): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const DIR = path.resolve(
  arg(
    'dir',
    process.env.LESSON_VIDEO_OUT ||
      path.join(__dirname, '../../.lesson-videos'),
  ),
);

/** server/.env, without overriding anything already in the environment (the same file Nest reads). */
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

interface Built {
  key: string;
  video: Buffer;
  poster: Buffer | null;
  captions: Buffer | null;
  chapters: { label: string; start: number }[];
  sha256: string;
  posterSha256: string | null;
  captionsSha256: string | null;
}

const sha = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');

function readBuilt(key: string, problems: string[]): Built | null {
  const dir = path.join(DIR, key);
  const mp4 = path.join(dir, 'preview.mp4');
  if (!fs.existsSync(mp4)) {
    problems.push(
      `${key}: ${mp4} does not exist — build it first (npm run lesson-videos:build -- --lesson ${key}).`,
    );
    return null;
  }
  const video = fs.readFileSync(mp4);
  if (!looksLikeMp4(video) || !probeMp4(video)) {
    problems.push(`${key}: preview.mp4 is not a readable MP4.`);
    return null;
  }
  const read = (name: string) =>
    fs.existsSync(path.join(dir, name))
      ? fs.readFileSync(path.join(dir, name))
      : null;
  const poster = read('poster.jpg');
  const captions = read('captions.vtt');
  if (poster && !looksLikeJpeg(poster)) {
    problems.push(`${key}: poster.jpg is not a JPEG.`);
    return null;
  }
  if (captions && !looksLikeWebVtt(captions)) {
    problems.push(`${key}: captions.vtt is not WebVTT.`);
    return null;
  }
  let chapters: Built['chapters'] = [];
  const infoFile = path.join(dir, 'info.json');
  if (fs.existsSync(infoFile)) {
    chapters =
      (
        JSON.parse(fs.readFileSync(infoFile, 'utf8')) as {
          chapters?: Built['chapters'];
        }
      ).chapters ?? [];
  }
  return {
    key,
    video,
    poster,
    captions,
    chapters,
    sha256: sha(video),
    posterSha256: poster ? sha(poster) : null,
    captionsSha256: captions ? sha(captions) : null,
  };
}

/**
 * The small description stored beside a video (lesson-videos/little-coders/<lesson>/<video hash>.json):
 * it is how the server finds the video in the bucket and learns its size, length and chapters.
 */
function describeBuilt(b: Built): { key: string; json: Buffer } {
  const info = probeMp4(b.video);
  if (!info) throw new Error(`${b.key}: preview.mp4 is not a readable MP4.`);
  const entry: PublishedVideo = {
    lesson: b.key,
    sha256: b.sha256,
    bytes: b.video.length,
    width: info.width,
    height: info.height,
    durationSeconds: Math.round(info.duration * 10) / 10,
    posterSha256: b.posterSha256,
    captionsSha256: b.captionsSha256,
    chapters: b.chapters,
  };
  return {
    key: lessonVideoKey(LC_VIDEO_PROGRAM_KEY, b.key, 'info', b.sha256),
    json: Buffer.from(`${JSON.stringify(entry, null, 2)}\n`),
  };
}

/** Copies the files into <stage>/lesson-videos/little-coders/<lesson>/<hash>.<ext> — the bucket's own layout. */
function stage(built: Built[], target: string): void {
  let files = 0;
  for (const b of built) {
    const put = (
      kind: 'video' | 'poster' | 'captions',
      body: Buffer | null,
      hash: string | null,
    ) => {
      if (!body || !hash) return;
      const dest = path.join(
        target,
        lessonVideoKey(LC_VIDEO_PROGRAM_KEY, b.key, kind, hash),
      );
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, body);
      files++;
    };
    put('video', b.video, b.sha256);
    put('poster', b.poster, b.posterSha256);
    put('captions', b.captions, b.captionsSha256);
    const info = describeBuilt(b);
    const dest = path.join(target, info.key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, info.json);
    files++;
  }
  console.log(
    `\nWrote ${files} file(s) for ${built.length} lesson(s) into ${target}/lesson-videos/`,
  );
  console.log(
    'Copy that "lesson-videos" folder to the root of the bucket, for example:',
  );
  console.log(
    `  rclone copy "${target}/lesson-videos" r2:<bucket>/lesson-videos --progress`,
  );
  console.log(
    `  aws s3 sync "${target}/lesson-videos" s3://<bucket>/lesson-videos --endpoint-url https://<account-id>.r2.cloudflarestorage.com`,
  );
}

async function main() {
  loadEnvFile(path.join(__dirname, '../../.env'));

  const wanted = arg('lesson');
  const keys = wanted
    ? wanted.split(',').map((s) => s.trim())
    : LC_LESSON_SPECS.map(lessonKey);
  for (const k of keys) {
    if (!LC_LESSON_SPECS.some((s) => lessonKey(s) === k))
      throw new Error(
        `There is no Little Coders lesson "${k}" (use c1l1 … c5l8).`,
      );
  }

  const problems: string[] = [];
  const built = keys
    .map((k) => readBuilt(k, problems))
    .filter((b): b is Built => b !== null);
  if (problems.length) {
    console.error(problems.join('\n'));
    if (built.length === 0) throw new Error('Nothing to upload.');
    console.error(
      `\nContinuing with the ${built.length} lesson(s) that are ready.\n`,
    );
  }
  const megabytes = built.reduce((n, b) => n + b.video.length, 0) / 1048576;
  console.log(
    `${built.length} lesson video(s) ready in ${DIR} (${megabytes.toFixed(0)} MB of video).`,
  );

  if (flag('stage')) {
    const target = path.resolve(arg('stage', 'lesson-videos-stage'));
    stage(built, target);
    return;
  }

  const storage = new LessonVideoStorageService();
  const problem = storage.configurationProblem();
  if (problem)
    throw new Error(
      `Lesson video storage is not set up: ${problem}. See docs/LESSON_VIDEOS_SETUP.md.`,
    );
  console.log(`Bucket "${storage.bucket()}" on ${storage.endpoint()}.`);

  if (flag('dry-run')) {
    for (const b of built) {
      const head = await storage.headObject(
        lessonVideoKey(LC_VIDEO_PROGRAM_KEY, b.key, 'video', b.sha256),
      );
      console.log(
        `  ${b.key}: ${head ? 'already in the bucket' : 'would be uploaded'} (${(b.video.length / 1048576).toFixed(1)} MB)`,
      );
    }
    console.log('\nDry run: nothing was uploaded or changed.');
    return;
  }

  if (flag('no-db')) {
    for (const b of built) {
      for (const [kind, body, hash] of [
        ['video', b.video, b.sha256],
        ['poster', b.poster, b.posterSha256],
        ['captions', b.captions, b.captionsSha256],
      ] as const) {
        if (!body || !hash) continue;
        const key = lessonVideoKey(LC_VIDEO_PROGRAM_KEY, b.key, kind, hash);
        const head = await storage.headObject(key);
        if (head && head.sizeBytes === body.length) continue;
        await storage.putObject(key, body, CONTENT_TYPE[kind]);
      }
      // The description goes last: the server only announces a video once everything it needs is there.
      const info = describeBuilt(b);
      await storage.putObject(info.key, info.json, CONTENT_TYPE.info);
      console.log(`  ${b.key}: in the bucket`);
    }
    console.log(
      '\nUploaded. The server shows these videos on its next start, or press "Check storage" in the Little Coders admin editor.',
    );
    return;
  }

  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const service = new LessonVideosService(prisma, storage);
    const course = await prisma.course.findFirst({
      where: {
        isCustom: false,
        slug: { in: ['little-coders', 'little-coders-path'] },
      },
      select: { id: true },
    });
    if (!course)
      throw new Error(
        'The Little Coders course is not in this database yet (start the server once so it is created).',
      );
    const lessons = await prisma.lesson.findMany({
      where: { courseId: course.id },
      select: { id: true, order: true, previewVideo: true },
    });
    let uploaded = 0;
    for (const b of built) {
      const order = orderOfLessonKey(b.key);
      const lesson = lessons.find((l) => l.order === order);
      if (!lesson) {
        console.error(`  ${b.key}: no such lesson in the database — skipped`);
        continue;
      }
      const current = validatePreviewVideo(lesson.previewVideo).value?.stored;
      if (current?.sha256 === b.sha256) {
        // Same video: make sure its description is in the bucket too, then move on.
        const info = describeBuilt(b);
        await storage.putObject(info.key, info.json, CONTENT_TYPE.info);
        console.log(`  ${b.key}: already uploaded`);
        continue;
      }
      if (current && !flag('replace')) {
        console.log(
          `  ${b.key}: the lesson already has a different video — kept (use --replace to swap it)`,
        );
        continue;
      }
      try {
        await service.upload(
          lesson.id,
          {
            video: [{ buffer: b.video }],
            poster: b.poster ? [{ buffer: b.poster }] : undefined,
            captions: b.captions ? [{ buffer: b.captions }] : undefined,
          },
          { chapters: JSON.stringify(b.chapters) },
        );
        const info = describeBuilt(b);
        await storage.putObject(info.key, info.json, CONTENT_TYPE.info);
        uploaded++;
        console.log(
          `  ${b.key}: uploaded and shown on its lesson (${(b.video.length / 1048576).toFixed(1)} MB)`,
        );
      } catch (err) {
        console.error(
          `  ${b.key}: FAILED — ${(err as Error).message ?? describeStorageError(err)}`,
        );
        process.exitCode = 1;
      }
    }
    console.log(`\nDone: ${uploaded} video(s) uploaded.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: Error) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
