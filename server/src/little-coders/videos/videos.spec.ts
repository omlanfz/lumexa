// The Little Coders lesson preview videos: narration and timeline, storage keys, the MP4 reader, the
// lesson-video bucket, and the admin upload — everything that does not need a browser or ffmpeg.

import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LC_LESSON_SPECS, lcPatchFor } from '../curriculum';
import { lcLessonOrder } from '../lc.constants';
import { publicVideo, validatePreviewVideo } from '../lc.validate';
import { readLcShared } from '../lc.public';
import {
  LESSON_VIDEO_URL_TTL_SECONDS,
  LessonVideoStorageError,
  LessonVideoStorageService,
} from './lesson-video-storage.service';
import {
  LessonVideosService,
  lessonKeyOfOrder,
  orderOfLessonKey,
  parseChapters,
} from './lesson-videos.service';
import type { PublishedVideo } from './published-video';
import { PUBLISHED_LESSON_VIDEOS } from './published-videos';
import { looksLikeJpeg, looksLikeMp4, looksLikeWebVtt, probeMp4 } from './mp4';
import {
  lessonKey,
  narrationFor,
  narrationWordCount,
  splitSentences,
} from './narration';
import {
  HARD_MAX_SECONDS,
  TARGET_MAX_SECONDS,
  TARGET_MIN_SECONDS,
  buildTimeline,
  toWebVtt,
} from './timeline';
import { MemoryLessonVideoStorage } from './testing/memory-lesson-video-storage';
import {
  CONTENT_TYPE,
  MAX_VIDEO_BYTES,
  isLessonVideoKey,
  kindOfKey,
  lessonVideoKey,
} from './video-keys';

// ─── Narration and timeline ─────────────────────────────────────────────────

/** Every sentence takes 3 seconds to say. */
const durations = (specIndex = 0) =>
  Object.fromEntries(
    narrationFor(LC_LESSON_SPECS[specIndex]).map((n) => [n.id, 3]),
  );

describe('the narration of the 40 videos', () => {
  it('splits sentences without losing words', () => {
    expect(splitSentences('Look! It works. Ready to try?')).toEqual([
      'Look!',
      'It works.',
      'Ready to try?',
    ]);
    expect(splitSentences('Say “Go!” now. Then stop.')).toEqual([
      'Say “Go!” now.',
      'Then stop.',
    ]);
    expect(splitSentences('One sentence only')).toEqual(['One sentence only']);
  });

  it('has six scenes, a script of 100–130 words and unique sentence ids for every lesson', () => {
    expect(LC_LESSON_SPECS).toHaveLength(40);
    const ids = new Set<string>();
    for (const spec of LC_LESSON_SPECS) {
      const sentences = narrationFor(spec);
      expect(new Set(sentences.map((s) => s.scene))).toEqual(
        new Set([0, 1, 2, 3, 4, 5]),
      );
      for (const s of sentences) {
        expect(ids.has(s.id)).toBe(false);
        ids.add(s.id);
        expect(s.text.length).toBeGreaterThan(0);
      }
      const words = narrationWordCount(spec);
      expect(words).toBeGreaterThanOrEqual(100);
      expect(words).toBeLessThanOrEqual(130);
      expect(lessonKey(spec)).toMatch(/^c[1-5]l[1-8]$/);
    }
  });
});

describe('the timeline of a video', () => {
  it('is contiguous, inside the 60–100 second target, and every sentence sits inside its scene', () => {
    for (let i = 0; i < LC_LESSON_SPECS.length; i++) {
      const spec = LC_LESSON_SPECS[i];
      const t = buildTimeline(spec, durations(i));
      expect(t.duration).toBeGreaterThanOrEqual(TARGET_MIN_SECONDS);
      expect(t.duration).toBeLessThanOrEqual(TARGET_MAX_SECONDS);
      expect(t.warnings).toEqual([]);
      expect(t.scenes).toHaveLength(6);
      expect(t.scenes[0].start).toBe(0);
      t.scenes.forEach((s, n) => {
        expect(s.end).toBeGreaterThan(s.start);
        if (n > 0) expect(s.start).toBeCloseTo(t.scenes[n - 1].end, 2);
      });
      for (const cue of t.cues) {
        const scene = t.scenes[cue.scene];
        expect(cue.start).toBeGreaterThanOrEqual(scene.start);
        expect(cue.end).toBeLessThanOrEqual(scene.end);
        expect(cue.end).toBeCloseTo(cue.start + 3, 2);
      }
      // sentences never overlap
      for (let n = 1; n < t.cues.length; n++)
        expect(t.cues[n].start).toBeGreaterThanOrEqual(t.cues[n - 1].end);
    }
  });

  it('gives a slow narrator the room it needs and says when a video runs past the target or the maximum', () => {
    const spec = LC_LESSON_SPECS[0];
    const sentences = narrationFor(spec).length;
    const speak = (total: number) =>
      Object.fromEntries(
        narrationFor(spec).map((n) => [n.id, total / sentences]),
      );
    // a narrator that needs 90 s of speech: the scenes stretch to fit, and the video is over the 100 s target
    const long = buildTimeline(spec, speak(90));
    expect(long.duration).toBeGreaterThan(TARGET_MAX_SECONDS);
    expect(long.duration).toBeLessThanOrEqual(HARD_MAX_SECONDS + 15);
    expect(long.warnings.join(' ')).toMatch(/over the/);
    // nothing is squeezed: every sentence still fits inside its own scene
    for (const cue of long.cues)
      expect(cue.end).toBeLessThanOrEqual(long.scenes[cue.scene].end);
    // a narrator that needs 120 s of speech goes past the maximum, and the timeline says so
    const tooLong = buildTimeline(spec, speak(120));
    expect(tooLong.duration).toBeGreaterThan(HARD_MAX_SECONDS);
    expect(tooLong.warnings.join(' ')).toMatch(
      new RegExp(`over the ${HARD_MAX_SECONDS}s maximum`),
    );
    // a very quick narrator is held to the 60 s minimum by giving the explanation and demo more room
    const quick = buildTimeline(spec, speak(20));
    expect(quick.duration).toBeGreaterThanOrEqual(TARGET_MIN_SECONDS);
    expect(quick.warnings).toEqual([]);
  });

  it('refuses to guess when a sentence has no recording', () => {
    expect(() => buildTimeline(LC_LESSON_SPECS[0], {})).toThrow(
      /narration step/,
    );
  });

  it('writes WebVTT subtitles', () => {
    const vtt = toWebVtt([
      { start: 0.5, end: 3.25, text: 'Hello there.' },
      { start: 3.6, end: 70.004, text: 'Second line.' },
    ]);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:00.500 --> 00:00:03.250\nHello there.');
    expect(vtt).toContain('00:00:03.600 --> 00:01:10.004\nSecond line.');
    expect(looksLikeWebVtt(Buffer.from(vtt))).toBe(true);
  });
});

// ─── Storage keys ───────────────────────────────────────────────────────────

const SHA = 'a'.repeat(64);

describe('lesson video storage keys', () => {
  it('names an object by its content, under the lesson', () => {
    expect(lessonVideoKey('little-coders', 'c1l1', 'video', SHA)).toBe(
      'lesson-videos/little-coders/c1l1/aaaaaaaaaaaa.mp4',
    );
    expect(lessonVideoKey('little-coders', 'c1l1', 'poster', SHA)).toMatch(
      /\.jpg$/,
    );
    expect(lessonVideoKey('little-coders', 'c1l1', 'captions', SHA)).toMatch(
      /\.vtt$/,
    );
    expect(() =>
      lessonVideoKey('little-coders', 'c1l1', 'video', 'nope'),
    ).toThrow(/SHA-256/);
  });

  it('only accepts keys inside lesson-videos/', () => {
    const ok = 'lesson-videos/little-coders/c1l1/aaaaaaaaaaaa.mp4';
    expect(isLessonVideoKey(ok)).toBe(true);
    for (const bad of [
      'homework/x/y/z/a.mp4',
      'assessments/little-coders/a/b/c/file.sb3',
      'lesson-videos/../homework/a/b.mp4',
      'lesson-videos/little-coders/c1l1/../../x.mp4',
      'lesson-videos/little-coders//aaaaaaaaaaaa.mp4',
      'lesson-videos/little-coders/c1l1/a b.mp4',
      'lesson-videos/little-coders/aaaaaaaaaaaa.mp4',
      '',
      undefined,
      42,
    ])
      expect(isLessonVideoKey(bad as never)).toBe(false);
    expect(kindOfKey(ok)).toBe('video');
    expect(kindOfKey('lesson-videos/p/k/x.jpg')).toBe('poster');
    expect(kindOfKey('lesson-videos/p/k/x.vtt')).toBe('captions');
    expect(kindOfKey('lesson-videos/p/k/x.exe')).toBeNull();
  });

  it('maps a class number to its lesson key (assessments have none)', () => {
    expect(lessonKeyOfOrder(1)).toBe('c1l1');
    expect(lessonKeyOfOrder(8)).toBe('c1l8');
    expect(lessonKeyOfOrder(9)).toBeNull();
    expect(lessonKeyOfOrder(10)).toBe('c2l1');
    expect(lessonKeyOfOrder(44)).toBe('c5l8');
    expect(lessonKeyOfOrder(45)).toBeNull();
    expect(lessonKeyOfOrder(46)).toBeNull();
  });
});

// ─── The MP4 reader ─────────────────────────────────────────────────────────

const box = (type: string, body: Buffer): Buffer => {
  const out = Buffer.alloc(8 + body.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  return out;
};

/** A minimal but structurally real MP4: ftyp, moov(mvhd, trak(tkhd)) and an mdat. */
export function fakeMp4(
  seconds: number,
  width: number,
  height: number,
  payload = 2048,
): Buffer {
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt32BE(1000, 12); // timescale
  mvhd.writeUInt32BE(Math.round(seconds * 1000), 16); // duration
  const tkhd = Buffer.alloc(84);
  tkhd.writeUInt32BE(width * 65536, 76);
  tkhd.writeUInt32BE(height * 65536, 80);
  const ftyp = box(
    'ftyp',
    Buffer.concat([
      Buffer.from('isom'),
      Buffer.alloc(4),
      Buffer.from('isomiso2'),
    ]),
  );
  return Buffer.concat([
    ftyp,
    box(
      'moov',
      Buffer.concat([box('mvhd', mvhd), box('trak', box('tkhd', tkhd))]),
    ),
    box('mdat', Buffer.alloc(payload, 7)),
  ]);
}

describe('the MP4 reader', () => {
  it('reads how long a video is and how big its picture is', () => {
    expect(probeMp4(fakeMp4(80.3, 1920, 1080))).toEqual({
      duration: 80.3,
      width: 1920,
      height: 1080,
    });
    expect(probeMp4(fakeMp4(12, 1280, 720))).toEqual({
      duration: 12,
      width: 1280,
      height: 720,
    });
  });

  it('recognises (and refuses) other files', () => {
    expect(looksLikeMp4(fakeMp4(5, 640, 360))).toBe(true);
    expect(
      looksLikeMp4(Buffer.from('definitely not a video, just some text here')),
    ).toBe(false);
    expect(
      probeMp4(Buffer.from('definitely not a video, just some text here')),
    ).toBeNull();
    expect(probeMp4(fakeMp4(5, 640, 360).subarray(0, 40))).toBeNull(); // no moov
    expect(looksLikeJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe(
      true,
    );
    expect(looksLikeJpeg(Buffer.from('GIF89a....'))).toBe(false);
    expect(looksLikeWebVtt(Buffer.from('﻿WEBVTT\n\n'))).toBe(true);
    expect(looksLikeWebVtt(Buffer.from('1\n00:00 --> 00:01\nhi'))).toBe(false);
  });
});

// ─── The bucket ─────────────────────────────────────────────────────────────

const ENV_KEYS = [
  'LESSON_VIDEO_R2_BUCKET',
  'LESSON_VIDEO_R2_ACCESS_KEY_ID',
  'LESSON_VIDEO_R2_SECRET_ACCESS_KEY',
  'LESSON_VIDEO_R2_ACCOUNT_ID',
  'LESSON_VIDEO_R2_ENDPOINT',
  'LESSON_VIDEO_PUBLIC_BASE_URL',
  'R2_BUCKET',
  'R2_ACCOUNT_ID',
  'HOMEWORK_R2_BUCKET',
  'HOMEWORK_R2_ACCOUNT_ID',
];

describe('LessonVideoStorageService', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
  const configure = () => {
    process.env.LESSON_VIDEO_R2_BUCKET = 'lumexa-lesson-videos';
    process.env.LESSON_VIDEO_R2_ACCESS_KEY_ID = 'AKIATESTTESTTESTTEST';
    process.env.LESSON_VIDEO_R2_SECRET_ACCESS_KEY =
      'secretsecretsecretsecretsecretsecret12';
    process.env.LESSON_VIDEO_R2_ACCOUNT_ID = 'abc123account';
  };
  const KEY = 'lesson-videos/little-coders/c1l1/aaaaaaaaaaaa.mp4';

  it('says exactly what is missing', () => {
    const s = new LessonVideoStorageService();
    expect(s.isConfigured()).toBe(false);
    expect(s.configurationProblem()).toMatch(
      /LESSON_VIDEO_R2_ACCOUNT_ID.*LESSON_VIDEO_R2_ACCESS_KEY_ID.*LESSON_VIDEO_R2_SECRET_ACCESS_KEY.*LESSON_VIDEO_R2_BUCKET/,
    );
    configure();
    expect(s.configurationProblem()).toBeNull();
    expect(s.isConfigured()).toBe(true);
    expect(s.endpoint()).toBe('https://abc123account.r2.cloudflarestorage.com');
  });

  it('refuses to share a bucket with the recordings or the homework files', () => {
    configure();
    const s = new LessonVideoStorageService();
    process.env.LESSON_VIDEO_R2_BUCKET = 'lumexa-recordings';
    expect(s.configurationProblem()).toMatch(/bucket of their own/);
    process.env.LESSON_VIDEO_R2_BUCKET = 'lumexa-homework';
    process.env.HOMEWORK_R2_BUCKET = 'lumexa-homework';
    expect(s.configurationProblem()).toMatch(/bucket of their own/);
  });

  it('gives a signed address that lasts six hours — or the public address when there is one', async () => {
    configure();
    const s = new LessonVideoStorageService();
    const signed = new URL(await s.urlFor(KEY));
    expect(signed.hostname).toBe('abc123account.r2.cloudflarestorage.com');
    expect(signed.pathname).toBe(`/lumexa-lesson-videos/${KEY}`);
    expect(signed.searchParams.get('X-Amz-Expires')).toBe(
      String(LESSON_VIDEO_URL_TTL_SECONDS),
    );
    expect(signed.searchParams.get('X-Amz-Signature')).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(signed.searchParams.get('response-content-type')).toBe(
      CONTENT_TYPE.video,
    );
    process.env.LESSON_VIDEO_PUBLIC_BASE_URL = 'https://videos.lumexa.example/';
    expect(await s.urlFor(KEY)).toBe(`https://videos.lumexa.example/${KEY}`);
    process.env.LESSON_VIDEO_PUBLIC_BASE_URL = 'http://insecure.example';
    expect(s.publicBaseUrl()).toBeNull();
  });

  it('will not touch a key outside lesson-videos/ and has no way to delete anything', async () => {
    configure();
    const s = new LessonVideoStorageService();
    await expect(s.urlFor('homework/a/b/c/x.mp4')).rejects.toBeInstanceOf(
      LessonVideoStorageError,
    );
    await expect(s.headObject('../x')).rejects.toBeInstanceOf(
      LessonVideoStorageError,
    );
    await expect(
      s.putObject('assessments/a/b/c/d/e', Buffer.from('x'), 'video/mp4'),
    ).rejects.toBeInstanceOf(LessonVideoStorageError);
    expect(
      (s as unknown as Record<string, unknown>).deleteObject,
    ).toBeUndefined();
  });
});

// ─── The upload ─────────────────────────────────────────────────────────────

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(500, 1),
]);
const VTT = Buffer.from('WEBVTT\n\n1\n00:00:00.500 --> 00:00:03.000\nHello\n');

function setup(
  opts: { order?: number; slug?: string; experience?: unknown } = {},
) {
  const patch = lcPatchFor(1, 1);
  const lesson = {
    id: 'lesson-1',
    order: opts.order ?? 1,
    experience:
      opts.experience === undefined ? patch.experience : opts.experience,
    previewVideo: patch.previewVideo as unknown,
    course: { slug: opts.slug ?? 'little-coders' },
  };
  const updates: { where: { id: string }; data: { previewVideo: unknown } }[] =
    [];
  const prisma = {
    lesson: {
      findUnique: jest.fn(async () => lesson),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: { previewVideo: unknown };
        }) => {
          updates.push(args);
          lesson.previewVideo = args.data.previewVideo;
          return lesson;
        },
      ),
    },
  };
  const storage = new MemoryLessonVideoStorage();
  const service = new LessonVideosService(prisma as never, storage);
  return { service, storage, prisma, lesson, updates };
}

const good = () => ({ video: [{ buffer: fakeMp4(80, 1920, 1080) }] });

describe('LessonVideosService.upload', () => {
  it('stores the video, poster and subtitles under content-addressed keys and records them on the lesson', async () => {
    const { service, storage, lesson } = setup();
    const chapters = JSON.stringify([
      { label: 'The question', start: 0 },
      { label: 'Your turn', start: 70.04 },
    ]);
    const out = await service.upload(
      'lesson-1',
      { ...good(), poster: [{ buffer: JPEG }], captions: [{ buffer: VTT }] },
      { chapters },
    );
    expect(out.stored.videoKey).toMatch(
      /^lesson-videos\/little-coders\/c1l1\/[a-f0-9]{12}\.mp4$/,
    );
    expect(out.stored.posterKey).toMatch(/\.jpg$/);
    expect(out.stored.captionsKey).toMatch(/\.vtt$/);
    expect(out.stored).toMatchObject({
      width: 1920,
      height: 1080,
      chapters: [
        { label: 'The question', start: 0 },
        { label: 'Your turn', start: 70 },
      ],
    });
    expect(out.previewVideo.durationSeconds).toBe(80);
    expect([...storage.objects.keys()].sort()).toEqual(
      [
        out.stored.captionsKey,
        out.stored.posterKey,
        out.stored.videoKey,
      ].sort(),
    );
    expect(storage.objects.get(out.stored.videoKey)?.contentType).toBe(
      'video/mp4',
    );
    // the lesson now carries it, and it still validates
    const saved = validatePreviewVideo(lesson.previewVideo);
    expect(saved.errors).toEqual([]);
    expect(saved.value?.stored?.videoKey).toBe(out.stored.videoKey);
    // the production brief is untouched
    expect(saved.value?.brief.scenes).toHaveLength(6);
  });

  it('is a no-op for the bucket when the same video is uploaded again', async () => {
    const { service, storage } = setup();
    await service.upload('lesson-1', good(), {});
    const writes = storage.writes.length;
    await service.upload('lesson-1', good(), {});
    expect(storage.writes.length).toBe(writes);
  });

  it('stores nothing and changes nothing when the video is not acceptable', async () => {
    const cases: [
      string,
      Parameters<LessonVideosService['upload']>[1],
      RegExp,
    ][] = [
      ['no video', {}, /Choose the MP4/],
      [
        'not an MP4',
        {
          video: [
            { buffer: Buffer.from('this is a text file, not a movie at all') },
          ],
        },
        /MP4 file/,
      ],
      [
        'too short',
        { video: [{ buffer: fakeMp4(3, 1920, 1080) }] },
        /between 10 and 120/,
      ],
      [
        'too long',
        { video: [{ buffer: fakeMp4(200, 1920, 1080) }] },
        /between 10 and 120/,
      ],
      ['wrong shape', { video: [{ buffer: fakeMp4(80, 1000, 1000) }] }, /16:9/],
      ['too small', { video: [{ buffer: fakeMp4(80, 640, 360) }] }, /1280×720/],
      [
        'bad poster',
        { ...good(), poster: [{ buffer: Buffer.from('not a jpeg') }] },
        /JPEG/,
      ],
      [
        'bad subtitles',
        { ...good(), captions: [{ buffer: Buffer.from('hello') }] },
        /WebVTT/,
      ],
    ];
    for (const [name, files, message] of cases) {
      const { service, storage, updates } = setup();
      await expect(service.upload('lesson-1', files, {})).rejects.toThrow(
        message,
      );
      expect(storage.writes).toEqual([]);
      expect(updates).toEqual([]);
      void name;
    }
    const { service } = setup();
    await expect(
      service.upload(
        'lesson-1',
        { video: [{ buffer: Buffer.alloc(MAX_VIDEO_BYTES + 1) }] },
        {},
      ),
    ).rejects.toThrow(/larger than/);
  });

  it('only accepts a Little Coders teaching lesson', async () => {
    await expect(
      setup({ order: 9 }).service.upload('lesson-1', good(), {}),
    ).rejects.toThrow(/assessment/);
    await expect(
      setup({ slug: 'game-creator' }).service.upload('lesson-1', good(), {}),
    ).rejects.toThrow(/Only a Little Coders lesson/);
    await expect(
      setup({ experience: null }).service.upload('lesson-1', good(), {}),
    ).rejects.toThrow(/Only a Little Coders lesson/);
    const missing = setup();
    missing.prisma.lesson.findUnique.mockResolvedValueOnce(null as never);
    await expect(
      missing.service.upload('nope', good(), {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('says so plainly when the bucket is not set up', async () => {
    const { service, storage } = setup();
    storage.problem = 'missing LESSON_VIDEO_R2_BUCKET';
    await expect(service.upload('lesson-1', good(), {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.upload('lesson-1', good(), {})).rejects.toThrow(
      /LESSON_VIDEOS_SETUP/,
    );
  });

  it('checks the chapter markers', () => {
    expect(parseChapters(undefined)).toEqual([]);
    expect(parseChapters('')).toEqual([]);
    expect(parseChapters('[{"label":"Hook","start":1.26}]')).toEqual([
      { label: 'Hook', start: 1.3 },
    ]);
    expect(() => parseChapters('not json')).toThrow(BadRequestException);
    expect(() => parseChapters('[{"label":"","start":1}]')).toThrow(/label/);
    expect(() => parseChapters('[{"label":"x","start":500}]')).toThrow(
      /start time/,
    );
    expect(() =>
      parseChapters(
        JSON.stringify(
          Array.from({ length: 9 }, (_, i) => ({ label: `c${i}`, start: i })),
        ),
      ),
    ).toThrow(/at most 8/);
  });
});

describe('what the lesson page receives', () => {
  it('turns a stored video into playable addresses (and nothing when storage is down)', async () => {
    const { service, storage, lesson } = setup();
    const { stored } = await service.upload(
      'lesson-1',
      { ...good(), poster: [{ buffer: JPEG }] },
      { chapters: '[{"label":"Hook","start":0}]' },
    );
    const urls = await service.resolveUrls(lesson.previewVideo);
    expect(urls?.videoUrl).toBe(
      `https://videos.test/${stored.videoKey}?sig=test`,
    );
    expect(urls?.posterUrl).toContain(stored.posterKey as string);
    expect(urls?.captionsUrl).toBe('');
    storage.failUrls = true;
    expect(await service.resolveUrls(lesson.previewVideo)).toBeNull();
    storage.failUrls = false;
    storage.problem = 'missing LESSON_VIDEO_R2_BUCKET';
    expect(await service.resolveUrls(lesson.previewVideo)).toBeNull();
    expect(await service.resolveUrls(lcPatchFor(1, 2).previewVideo)).toBeNull(); // no stored video
  });

  it('puts the addresses and chapters in the student payload — never the production brief', async () => {
    const { service, lesson } = setup();
    await service.upload('lesson-1', good(), {
      chapters: '[{"label":"Hook","start":0},{"label":"Idea","start":8}]',
    });
    const urls = await service.resolveUrls(lesson.previewVideo);
    const video = validatePreviewVideo(lesson.previewVideo).value!;
    const pub = publicVideo(video, urls);
    expect(pub.videoUrl).toMatch(/^https:\/\/videos\.test\/lesson-videos\//);
    expect(pub.chapters).toEqual([
      { label: 'Hook', start: 0 },
      { label: 'Idea', start: 8 },
    ]);
    expect(JSON.stringify(pub)).not.toMatch(/narration|storyboard|brief/i);
    // without resolved addresses the stored video simply is not offered
    expect(publicVideo(video, null).videoUrl).toBe('');
    // the whole lesson payload carries it too
    const shared = readLcShared(
      {
        experience: lcPatchFor(1, 1).experience,
        previewVideo: lesson.previewVideo,
        projectCard: null,
        homeworkCard: null,
      } as never,
      {},
      urls,
    );
    expect(shared?.previewVideo?.videoUrl).toBe(pub.videoUrl);
  });

  it('lets an admin detach a video without deleting a single file', async () => {
    const { service, storage, lesson } = setup();
    const { stored } = await service.upload('lesson-1', good(), {});
    const before = storage.objects.size;
    const detached = await service.detach('lesson-1');
    expect(detached.stored).toBeUndefined();
    expect(
      validatePreviewVideo(lesson.previewVideo).value?.stored,
    ).toBeUndefined();
    expect(storage.objects.size).toBe(before);
    expect(storage.objects.has(stored.videoKey)).toBe(true);
  });
});

describe('a stored video on a lesson record', () => {
  it('is validated like the rest of the record', () => {
    const base = JSON.parse(
      JSON.stringify(lcPatchFor(1, 1).previewVideo),
    ) as Record<string, unknown>;
    const stored = {
      videoKey: 'lesson-videos/little-coders/c1l1/aaaaaaaaaaaa.mp4',
      posterKey: null,
      captionsKey: null,
      bytes: 1000,
      sha256: SHA,
      width: 1920,
      height: 1080,
      chapters: [],
      uploadedAt: '2026-11-12T00:00:00.000Z',
    };
    expect(validatePreviewVideo({ ...base, stored }).errors).toEqual([]);
    expect(
      validatePreviewVideo({
        ...base,
        stored: { ...stored, videoKey: 'homework/a/b/c/x.mp4' },
      }).errors.join(),
    ).toMatch(/lesson-video storage key/);
    expect(
      validatePreviewVideo({
        ...base,
        stored: {
          ...stored,
          posterKey: 'lesson-videos/little-coders/c1l1/aaaaaaaaaaaa.mp4',
        },
      }).errors.join(),
    ).toMatch(/posterKey/);
    expect(
      validatePreviewVideo({
        ...base,
        stored: { ...stored, sha256: 'xyz' },
      }).errors.join(),
    ).toMatch(/SHA-256/);
    expect(
      validatePreviewVideo({
        ...base,
        stored: { ...stored, width: 10 },
      }).errors.join(),
    ).toMatch(/width/);
    expect(validatePreviewVideo({ ...base, stored: null }).errors).toEqual([]);
  });
});

// ─── Switching on the videos that are already in the bucket ─────────────────

const sha = (c: string) => c.repeat(64);

describe('the list of finished videos', () => {
  it('has exactly one video for each of the 40 lessons, as the standard describes them', () => {
    expect(PUBLISHED_LESSON_VIDEOS.map((v) => v.lesson)).toEqual(
      LC_LESSON_SPECS.map(lessonKey),
    );
    for (const v of PUBLISHED_LESSON_VIDEOS) {
      expect(v.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(v.posterSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(v.captionsSha256).toMatch(/^[a-f0-9]{64}$/);
      expect([v.width, v.height]).toEqual([1920, 1080]);
      expect(v.durationSeconds).toBeGreaterThanOrEqual(TARGET_MIN_SECONDS);
      expect(v.durationSeconds).toBeLessThanOrEqual(TARGET_MAX_SECONDS);
      expect(v.bytes).toBeGreaterThan(1_000_000);
      expect(v.bytes).toBeLessThanOrEqual(MAX_VIDEO_BYTES);
      expect(v.chapters).toHaveLength(6);
      expect(v.chapters[0].start).toBe(0);
      // the first chapter starts at 0 and they only move forward, inside the video
      v.chapters.forEach((c, i) => {
        expect(c.label.length).toBeGreaterThan(0);
        if (i > 0) expect(c.start).toBeGreaterThan(v.chapters[i - 1].start);
        expect(c.start).toBeLessThan(v.durationSeconds);
      });
    }
    // every video is different, so every key is different
    expect(new Set(PUBLISHED_LESSON_VIDEOS.map((v) => v.sha256)).size).toBe(40);
  });

  it('is valid as the stored part of a lesson record', () => {
    for (const v of PUBLISHED_LESSON_VIDEOS) {
      const base = JSON.parse(
        JSON.stringify(
          lcPatchFor(Number(v.lesson[1]), Number(v.lesson[3])).previewVideo,
        ),
      ) as Record<string, unknown>;
      const stored = {
        videoKey: lessonVideoKey('little-coders', v.lesson, 'video', v.sha256),
        posterKey: lessonVideoKey(
          'little-coders',
          v.lesson,
          'poster',
          v.posterSha256 as string,
        ),
        captionsKey: lessonVideoKey(
          'little-coders',
          v.lesson,
          'captions',
          v.captionsSha256 as string,
        ),
        bytes: v.bytes,
        sha256: v.sha256,
        width: v.width,
        height: v.height,
        chapters: v.chapters,
        uploadedAt: '2026-11-12T00:00:00.000Z',
      };
      expect(
        validatePreviewVideo({
          ...base,
          durationSeconds: v.durationSeconds,
          stored,
        }).errors,
      ).toEqual([]);
    }
  });

  it('maps lesson keys to class numbers', () => {
    expect(orderOfLessonKey('c1l1')).toBe(1);
    expect(orderOfLessonKey('c2l5')).toBe(14);
    expect(orderOfLessonKey('c5l8')).toBe(44);
    for (const k of ['c6l1', 'c1l9', 'c0l1', 'x', ''])
      expect(orderOfLessonKey(k)).toBeNull();
  });
});

function attachWorld(storedAlready: Record<string, unknown> = {}) {
  const rows = [1, 2, 3, 4].map((lesson) => {
    const patch = lcPatchFor(1, lesson);
    return {
      id: `lesson-${lesson}`,
      order: lcLessonOrder(1, lesson),
      experience: patch.experience as unknown,
      previewVideo: (storedAlready[`c1l${lesson}`]
        ? {
            ...(patch.previewVideo as object),
            stored: storedAlready[`c1l${lesson}`],
          }
        : patch.previewVideo) as unknown,
    };
  });
  const prisma = {
    course: { findFirst: jest.fn(async () => ({ id: 'course-1' })) },
    lesson: {
      findMany: jest.fn(async () => rows),
      update: jest.fn(
        async (args: {
          where: { id: string };
          data: { previewVideo: unknown };
        }) => {
          const row = rows.find((r) => r.id === args.where.id)!;
          row.previewVideo = args.data.previewVideo;
          return row;
        },
      ),
    },
  };
  const storage = new MemoryLessonVideoStorage();
  return {
    rows,
    prisma,
    storage,
    service: new LessonVideosService(prisma as never, storage),
  };
}

const entry = (
  lesson: string,
  bytes: number,
  overrides: Partial<PublishedVideo> = {},
): PublishedVideo => ({
  lesson,
  sha256: sha('a'),
  bytes,
  width: 1920,
  height: 1080,
  durationSeconds: 80.3,
  posterSha256: sha('b'),
  captionsSha256: sha('c'),
  chapters: [{ label: 'The question', start: 0 }],
  ...overrides,
});

describe('LessonVideosService.attachPublished', () => {
  it('shows the listed videos that are in the bucket, and only those', async () => {
    const { service, storage, rows } = attachWorld();
    const key = (
      lesson: string,
      kind: 'video' | 'poster' | 'captions',
      h: string,
    ) => lessonVideoKey('little-coders', lesson, kind, h);
    // c1l1: video + poster in the bucket (no subtitles) · c1l2: a file of the wrong size · c1l3: nothing there
    await storage.putObject(
      key('c1l1', 'video', sha('a')),
      Buffer.alloc(1000),
      'video/mp4',
    );
    await storage.putObject(
      key('c1l1', 'poster', sha('b')),
      Buffer.alloc(10),
      'image/jpeg',
    );
    await storage.putObject(
      key('c1l2', 'video', sha('a')),
      Buffer.alloc(999),
      'video/mp4',
    );
    const report = await service.attachPublished([
      entry('c1l1', 1000),
      entry('c1l2', 1000),
      entry('c1l3', 1000),
      entry('c9l9', 1000),
    ]);
    expect(report).toEqual({
      attached: ['c1l1'],
      alreadyHave: [],
      notInStorage: ['c1l2', 'c1l3'],
      noLesson: ['c9l9'],
      storageProblem: null,
    });
    const stored = validatePreviewVideo(rows[0].previewVideo).value?.stored;
    expect(stored).toMatchObject({
      videoKey: key('c1l1', 'video', sha('a')),
      posterKey: key('c1l1', 'poster', sha('b')),
      captionsKey: null, // listed, but not in the bucket
      bytes: 1000,
      width: 1920,
      height: 1080,
      chapters: [{ label: 'The question', start: 0 }],
    });
    expect(
      validatePreviewVideo(rows[0].previewVideo).value?.durationSeconds,
    ).toBe(80.3);
    expect(
      validatePreviewVideo(rows[1].previewVideo).value?.stored,
    ).toBeUndefined();
    // it only ever reads the bucket
    expect(storage.writes).toHaveLength(3); // the three objects put above
  });

  it('is safe to run again, and never replaces a video the lesson already has', async () => {
    const adminsOwn = {
      videoKey: 'lesson-videos/little-coders/c1l2/ffffffffffff.mp4',
      posterKey: null,
      captionsKey: null,
      bytes: 5000,
      sha256: sha('f'),
      width: 1920,
      height: 1080,
      chapters: [],
      uploadedAt: '2026-11-01T00:00:00.000Z',
    };
    const { service, storage, rows, prisma } = attachWorld({ c1l2: adminsOwn });
    for (const lesson of ['c1l1', 'c1l2']) {
      await storage.putObject(
        lessonVideoKey('little-coders', lesson, 'video', sha('a')),
        Buffer.alloc(1000),
        'video/mp4',
      );
    }
    const first = await service.attachPublished([
      entry('c1l1', 1000),
      entry('c1l2', 1000),
    ]);
    expect(first.attached).toEqual(['c1l1']);
    expect(first.alreadyHave).toEqual(['c1l2']);
    const second = await service.attachPublished([
      entry('c1l1', 1000),
      entry('c1l2', 1000),
    ]);
    expect(second.attached).toEqual([]);
    expect(second.alreadyHave).toEqual(['c1l1', 'c1l2']);
    expect(prisma.lesson.update).toHaveBeenCalledTimes(1);
    expect(
      validatePreviewVideo(rows[1].previewVideo).value?.stored?.videoKey,
    ).toBe(adminsOwn.videoKey);
  });

  it('does nothing — and does not even read the database — while the bucket is not set up', async () => {
    const { service, storage, prisma } = attachWorld();
    storage.problem = 'missing LESSON_VIDEO_R2_BUCKET';
    const report = await service.attachPublished([entry('c1l1', 1000)]);
    expect(report.storageProblem).toMatch(/LESSON_VIDEO_R2_BUCKET/);
    expect(report.attached).toEqual([]);
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
  });

  it('keeps what it did when the bucket stops answering part-way', async () => {
    const { service, storage, rows } = attachWorld();
    await storage.putObject(
      lessonVideoKey('little-coders', 'c1l1', 'video', sha('a')),
      Buffer.alloc(1000),
      'video/mp4',
    );
    const head = storage.headObject.bind(storage);
    let calls = 0;
    storage.headObject = async (key: string) => {
      if (++calls > 3) throw new Error('R2 is not answering');
      return head(key);
    };
    const report = await service.attachPublished([
      entry('c1l1', 1000),
      entry('c1l2', 1000),
      entry('c1l3', 1000),
    ]);
    expect(report.attached).toEqual(['c1l1']);
    expect(report.storageProblem).toMatch(/not answering/);
    expect(
      validatePreviewVideo(rows[0].previewVideo).value?.stored,
    ).toBeDefined();
  });

  it('reports a missing course instead of failing', async () => {
    const { service, prisma } = attachWorld();
    prisma.course.findFirst.mockResolvedValueOnce(null as never);
    const report = await service.attachPublished([entry('c1l1', 1000)]);
    expect(report.noLesson).toEqual(['c1l1']);
  });
});

describe('LessonVideosService.status', () => {
  it('tells an admin whether storage is set up and how many lessons show a video', async () => {
    const { service, storage, rows } = attachWorld();
    // the assessment sessions never count as teaching lessons
    (
      rows as {
        id: string;
        order: number;
        experience: unknown;
        previewVideo: unknown;
      }[]
    ).push({
      id: 'assessment',
      order: 9,
      experience: null,
      previewVideo: null,
    });
    await storage.putObject(
      lessonVideoKey('little-coders', 'c1l1', 'video', sha('a')),
      Buffer.alloc(1000),
      'video/mp4',
    );
    await service.attachPublished([entry('c1l1', 1000)]);
    expect(await service.status()).toEqual({
      configured: true,
      problem: null,
      storage: { bucket: 'memory', delivery: 'signed' },
      lessons: 4,
      withVideo: 1,
      published: PUBLISHED_LESSON_VIDEOS.length,
    });
    storage.problem = 'missing LESSON_VIDEO_R2_BUCKET';
    const down = await service.status();
    expect(down).toMatchObject({
      configured: false,
      problem: 'missing LESSON_VIDEO_R2_BUCKET',
      storage: null,
      withVideo: 1,
    });
  });
});
