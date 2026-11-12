// FILE PATH: server/src/little-coders/videos/lesson-videos.service.ts
//
// The preview videos of the Little Coders lessons: an admin uploads one (or the bulk tool does), it is
// stored in the lesson-video bucket under a content-addressed key, and the lesson record remembers the
// key. When a lesson is opened the key becomes a playable address (resolveUrls). Nothing here ever
// deletes a stored video: "removing" one only detaches it from the lesson.

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import {
  LC_COURSE_COUNT,
  LC_COURSE_SLUG,
  LC_LESSONS_PER_COURSE,
  isLittleCodersSlug,
  lcLessonOrder,
} from '../lc.constants';
import type {
  LcPreviewVideo,
  LcStoredVideo,
  LcVideoChapter,
} from '../lc.types';
import { validatePreviewVideo, type ResolvedVideoUrls } from '../lc.validate';
import {
  LESSON_VIDEO_STORAGE,
  type LessonVideoStorage,
} from './lesson-video-storage.service';
import { looksLikeJpeg, looksLikeMp4, looksLikeWebVtt, probeMp4 } from './mp4';
import { parsePublishedVideo, type PublishedVideo } from './published-video';
import {
  CONTENT_TYPE,
  LESSON_VIDEO_KEY_ROOT,
  MAX_CAPTIONS_BYTES,
  MAX_POSTER_BYTES,
  MAX_VIDEO_BYTES,
  kindOfKey,
  lessonVideoKey,
} from './video-keys';

export const LC_VIDEO_PROGRAM_KEY = 'little-coders';

/** The smallest and largest preview video the template allows (60–100 s is the target, 120 s the limit). */
const MIN_SECONDS = 10;
const MAX_SECONDS = 120;

export interface UploadedFile {
  buffer: Buffer;
  originalname?: string;
  size?: number;
}

const json = (v: unknown) => v as Prisma.InputJsonValue;
const sha256 = (buf: Buffer) =>
  crypto.createHash('sha256').update(buf).digest('hex');

/** "c2l5" for class 14 — null for a class that is not one of the 40 lessons (the assessments). */
export function lessonKeyOfOrder(order: number): string | null {
  const per = LC_LESSONS_PER_COURSE + 1;
  const course = Math.ceil(order / per);
  const lesson = order - (course - 1) * per;
  const isLesson =
    course >= 1 &&
    course <= LC_COURSE_COUNT &&
    lesson >= 1 &&
    lesson <= LC_LESSONS_PER_COURSE;
  return isLesson ? `c${course}l${lesson}` : null;
}

export function parseChapters(raw: unknown): LcVideoChapter[] {
  if (raw === undefined || raw === null || raw === '') return [];
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new BadRequestException(
        'The chapters must be a JSON list like [{"label":"Hook","start":0}].',
      );
    }
  }
  if (!Array.isArray(value) || value.length > 8)
    throw new BadRequestException('There can be at most 8 chapters.');
  return value.map((c, i) => {
    const o = (c ?? {}) as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const start = Number(o.start);
    if (!label || label.length > 40)
      throw new BadRequestException(
        `Chapter ${i + 1} needs a label of up to 40 characters.`,
      );
    if (!Number.isFinite(start) || start < 0 || start > MAX_SECONDS)
      throw new BadRequestException(
        `Chapter ${i + 1} needs a start time between 0 and ${MAX_SECONDS} seconds.`,
      );
    return { label, start: Math.round(start * 10) / 10 };
  });
}

/** What a "look in storage and switch on the videos that are there" pass did. */
export interface AttachReport {
  /** Lessons that now show their video. */
  attached: string[];
  /** Lessons that already had a video (an admin's own upload is never replaced). */
  alreadyHave: string[];
  /** Listed videos that are not in the bucket (yet). */
  notInStorage: string[];
  /** Listed videos whose lesson does not exist in the database. */
  noLesson: string[];
  /** Why nothing could be checked (the bucket is not set up or not reachable), if so. */
  storageProblem: string | null;
}

/** For the admin page. */
export interface LessonVideoStatus {
  configured: boolean;
  problem: string | null;
  storage: { bucket: string; delivery: 'signed' | 'public' } | null;
  /** Teaching lessons in the database (40 when the program is complete). */
  lessons: number;
  /** … of which show a video kept in the bucket. */
  withVideo: number;
  /** Lessons the bucket holds a video description for (they are switched on once their video is there). */
  published: number;
}

const orderIsLesson = (order: number): boolean =>
  lessonKeyOfOrder(order) !== null;

/** "c2l5" → the class number of that lesson (14). */
export function orderOfLessonKey(key: string): number | null {
  const m = /^c([1-9])l([1-9])$/.exec(key);
  if (!m) return null;
  const course = Number(m[1]);
  const lesson = Number(m[2]);
  return course <= LC_COURSE_COUNT && lesson <= LC_LESSONS_PER_COURSE
    ? lcLessonOrder(course, lesson)
    : null;
}

@Injectable()
export class LessonVideosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LessonVideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESSON_VIDEO_STORAGE) private readonly storage: LessonVideoStorage,
  ) {}

  /** Where the lesson page plays a stored video from. Null when the lesson has none or storage is down. */
  async resolveUrls(
    rawPreviewVideo: unknown,
  ): Promise<ResolvedVideoUrls | null> {
    const video = validatePreviewVideo(rawPreviewVideo).value;
    const stored = video?.stored;
    if (!stored || !this.storage.isConfigured()) return null;
    try {
      const [videoUrl, posterUrl, captionsUrl] = await Promise.all([
        this.storage.urlFor(stored.videoKey),
        stored.posterKey ? this.storage.urlFor(stored.posterKey) : '',
        stored.captionsKey ? this.storage.urlFor(stored.captionsKey) : '',
      ]);
      return { videoUrl, posterUrl, captionsUrl };
    } catch (err) {
      // A storage hiccup must not break the lesson page: it falls back to "video coming soon".
      this.logger.warn(
        `Could not make an address for a lesson video: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Admin: store the video (and optional poster / subtitles) of one Little Coders lesson. The video is
   * read for what it really is — an MP4 of 10–120 seconds in 16:9 — before anything is stored.
   */
  async upload(
    lessonId: string,
    files: {
      video?: UploadedFile[];
      poster?: UploadedFile[];
      captions?: UploadedFile[];
    },
    meta: { chapters?: unknown } = {},
  ): Promise<{ previewVideo: LcPreviewVideo; stored: LcStoredVideo }> {
    const problem = this.storage.configurationProblem();
    if (problem) {
      throw new ServiceUnavailableException(
        `Lesson video storage is not set up yet (${problem}). See docs/LESSON_VIDEOS_SETUP.md.`,
      );
    }
    const lesson = await this.lessonRow(lessonId);
    const key = lessonKeyOfOrder(lesson.order);
    if (!key)
      throw new BadRequestException(
        'Only the eight teaching lessons of a course have a preview video, not its assessment.',
      );

    const video = files.video?.[0];
    if (!video)
      throw new BadRequestException('Choose the MP4 video to upload.');
    if (video.buffer.length > MAX_VIDEO_BYTES)
      throw new BadRequestException(
        `The video is larger than ${Math.round(MAX_VIDEO_BYTES / 1048576)} MB.`,
      );
    if (!looksLikeMp4(video.buffer))
      throw new BadRequestException(
        'The video must be an MP4 file (H.264 video with AAC sound).',
      );
    const info = probeMp4(video.buffer);
    if (!info)
      throw new BadRequestException(
        'The MP4 could not be read. Export it again with "fast start" enabled.',
      );
    if (info.duration < MIN_SECONDS || info.duration > MAX_SECONDS) {
      throw new BadRequestException(
        `The video is ${Math.round(info.duration)} seconds long; a preview video is between ${MIN_SECONDS} and ${MAX_SECONDS} seconds (60–100 is the target).`,
      );
    }
    if (
      info.width < 1280 ||
      info.height < 720 ||
      Math.abs(info.width / info.height - 16 / 9) > 0.03
    ) {
      throw new BadRequestException(
        `The video is ${info.width}×${info.height}; it must be 16:9 and at least 1280×720 (1920×1080 is the standard).`,
      );
    }
    const poster = files.poster?.[0];
    if (
      poster &&
      (!looksLikeJpeg(poster.buffer) || poster.buffer.length > MAX_POSTER_BYTES)
    ) {
      throw new BadRequestException(
        `The poster must be a JPEG image under ${Math.round(MAX_POSTER_BYTES / 1048576)} MB.`,
      );
    }
    const captions = files.captions?.[0];
    if (
      captions &&
      (!looksLikeWebVtt(captions.buffer) ||
        captions.buffer.length > MAX_CAPTIONS_BYTES)
    ) {
      throw new BadRequestException(
        'The subtitles must be a WebVTT (.vtt) file that starts with WEBVTT.',
      );
    }

    const stored: LcStoredVideo = {
      videoKey: lessonVideoKey(
        LC_VIDEO_PROGRAM_KEY,
        key,
        'video',
        sha256(video.buffer),
      ),
      posterKey: poster
        ? lessonVideoKey(
            LC_VIDEO_PROGRAM_KEY,
            key,
            'poster',
            sha256(poster.buffer),
          )
        : null,
      captionsKey: captions
        ? lessonVideoKey(
            LC_VIDEO_PROGRAM_KEY,
            key,
            'captions',
            sha256(captions.buffer),
          )
        : null,
      bytes: video.buffer.length,
      sha256: sha256(video.buffer),
      width: info.width,
      height: info.height,
      chapters: parseChapters(meta.chapters),
      uploadedAt: new Date().toISOString(),
    };

    // Store everything first; the lesson only learns about the video once it is really in R2.
    await this.put(stored.videoKey, video.buffer, CONTENT_TYPE.video);
    if (poster && stored.posterKey)
      await this.put(stored.posterKey, poster.buffer, CONTENT_TYPE.poster);
    if (captions && stored.captionsKey)
      await this.put(
        stored.captionsKey,
        captions.buffer,
        CONTENT_TYPE.captions,
      );
    const previewVideo = await this.register(
      lessonId,
      lesson.previewVideo,
      stored,
      Math.round(info.duration * 10) / 10,
    );
    return { previewVideo, stored };
  }

  /** Admin: the lesson stops showing its stored video. The stored files stay in the bucket. */
  async detach(lessonId: string): Promise<LcPreviewVideo> {
    const lesson = await this.lessonRow(lessonId);
    const current = validatePreviewVideo(lesson.previewVideo).value;
    if (!current)
      throw new BadRequestException('This lesson has no preview video record.');
    const { stored: _gone, ...rest } = current;
    void _gone;
    const checked = validatePreviewVideo(rest);
    if (!checked.value) throw new BadRequestException(checked.errors.join(' '));
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { previewVideo: json(checked.value) },
    });
    return checked.value;
  }

  /**
   * The videos the bucket describes: beside every lesson video the upload tool stores a small description
   * (lesson-videos/little-coders/<lesson>/<video hash>.json). This reads the newest description of each
   * lesson; one that is not valid, or does not belong to its lesson and video, is ignored.
   */
  async discoverPublished(): Promise<PublishedVideo[]> {
    const objects = await this.storage.listObjects(
      `${LESSON_VIDEO_KEY_ROOT}${LC_VIDEO_PROGRAM_KEY}/`,
    );
    const newest = new Map<string, { key: string; at: number }>();
    for (const o of objects) {
      if (kindOfKey(o.key) !== 'info') continue;
      const lesson = o.key.split('/')[2];
      const at = o.lastModified?.getTime() ?? 0;
      const seen = newest.get(lesson);
      if (!seen || at >= seen.at) newest.set(lesson, { key: o.key, at });
    }
    const found: PublishedVideo[] = [];
    for (const [lesson, { key }] of newest) {
      let entry: PublishedVideo | null = null;
      try {
        const raw = await this.storage.getSmallObject(key);
        entry = raw
          ? parsePublishedVideo(JSON.parse(raw.toString('utf8')))
          : null;
      } catch {
        entry = null;
      }
      if (
        !entry ||
        entry.lesson !== lesson ||
        !key.endsWith(`/${entry.sha256.slice(0, 12)}.json`)
      ) {
        this.logger.warn(
          `Ignoring a lesson video description that is not valid: ${key}`,
        );
        continue;
      }
      found.push(entry);
    }
    return found.sort((a, b) => a.lesson.localeCompare(b.lesson));
  }

  /** How many lessons the bucket has a video description for (a listing only — nothing is read). */
  private async countDescribed(): Promise<number> {
    if (!this.storage.isConfigured()) return 0;
    try {
      const objects = await this.storage.listObjects(
        `${LESSON_VIDEO_KEY_ROOT}${LC_VIDEO_PROGRAM_KEY}/`,
      );
      return new Set(
        objects
          .filter((o) => kindOfKey(o.key) === 'info')
          .map((o) => o.key.split('/')[2]),
      ).size;
    } catch {
      return 0;
    }
  }

  /**
   * Switches on the videos the bucket describes (or the `entries` given): each is looked for under its
   * content-addressed key and, when found, recorded on its lesson. It never replaces a video a lesson
   * already has (an admin's own upload wins) and never writes to the bucket. Safe to run again and again.
   */
  async attachPublished(
    entries?: readonly PublishedVideo[],
  ): Promise<AttachReport> {
    const report: AttachReport = {
      attached: [],
      alreadyHave: [],
      notInStorage: [],
      noLesson: [],
      storageProblem: null,
    };
    const problem = this.storage.configurationProblem();
    if (problem) {
      report.storageProblem = problem;
      return report;
    }
    let list: readonly PublishedVideo[];
    try {
      list = entries ?? (await this.discoverPublished());
    } catch (err) {
      report.storageProblem = (err as Error).message;
      return report;
    }
    entries = list;
    const course = await this.prisma.course.findFirst({
      where: {
        isCustom: false,
        slug: { in: [LC_COURSE_SLUG, `${LC_COURSE_SLUG}-path`] },
      },
      select: { id: true },
    });
    if (!course) {
      report.noLesson.push(...entries.map((e) => e.lesson));
      return report;
    }
    const rows = await this.prisma.lesson.findMany({
      where: { courseId: course.id },
      select: { id: true, order: true, experience: true, previewVideo: true },
    });
    const byOrder = new Map(rows.map((r) => [r.order, r]));

    try {
      for (const entry of entries) {
        const order = orderOfLessonKey(entry.lesson);
        const row = order === null ? undefined : byOrder.get(order);
        const current = row
          ? validatePreviewVideo(row.previewVideo).value
          : null;
        if (
          !row ||
          row.experience === null ||
          row.experience === undefined ||
          !current
        ) {
          report.noLesson.push(entry.lesson);
          continue;
        }
        if (current.stored) {
          report.alreadyHave.push(entry.lesson);
          continue;
        }
        const videoKey = lessonVideoKey(
          LC_VIDEO_PROGRAM_KEY,
          entry.lesson,
          'video',
          entry.sha256,
        );
        const head = await this.storage.headObject(videoKey);
        if (!head || head.sizeBytes !== entry.bytes) {
          report.notInStorage.push(entry.lesson);
          continue;
        }
        const posterKey = entry.posterSha256
          ? lessonVideoKey(
              LC_VIDEO_PROGRAM_KEY,
              entry.lesson,
              'poster',
              entry.posterSha256,
            )
          : null;
        const captionsKey = entry.captionsSha256
          ? lessonVideoKey(
              LC_VIDEO_PROGRAM_KEY,
              entry.lesson,
              'captions',
              entry.captionsSha256,
            )
          : null;
        const stored: LcStoredVideo = {
          videoKey,
          posterKey:
            posterKey && (await this.storage.headObject(posterKey))
              ? posterKey
              : null,
          captionsKey:
            captionsKey && (await this.storage.headObject(captionsKey))
              ? captionsKey
              : null,
          bytes: entry.bytes,
          sha256: entry.sha256,
          width: entry.width,
          height: entry.height,
          chapters: entry.chapters,
          uploadedAt: new Date().toISOString(),
        };
        await this.register(
          row.id,
          row.previewVideo,
          stored,
          entry.durationSeconds,
        );
        report.attached.push(entry.lesson);
      }
    } catch (err) {
      // The bucket could not be reached part-way: what was done stays done, the rest is tried again later.
      report.storageProblem = (err as Error).message;
    }
    return report;
  }

  /** For the admin page: is storage set up, and how many of the 40 lessons show a stored video? */
  async status(): Promise<LessonVideoStatus> {
    const problem = this.storage.configurationProblem();
    const course = await this.prisma.course.findFirst({
      where: {
        isCustom: false,
        slug: { in: [LC_COURSE_SLUG, `${LC_COURSE_SLUG}-path`] },
      },
      select: { id: true },
    });
    const rows = course
      ? await this.prisma.lesson.findMany({
          where: { courseId: course.id },
          select: { order: true, experience: true, previewVideo: true },
        })
      : [];
    const lessons = rows.filter(
      (r) =>
        orderIsLesson(r.order) &&
        r.experience !== null &&
        r.experience !== undefined,
    );
    const withVideo = lessons.filter(
      (r) => !!validatePreviewVideo(r.previewVideo).value?.stored,
    ).length;
    return {
      configured: problem === null,
      problem,
      storage: this.storage.describe(),
      lessons: lessons.length,
      withVideo,
      published: await this.countDescribed(),
    };
  }

  /** At start-up: switch on whatever is already in the bucket. Never slows or stops the boot. */
  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return;
    // Storage not set up: the storage service already says so once at start-up, so stay quiet here.
    if (!this.storage.isConfigured()) return;
    void this.attachPublished()
      .then((r) => {
        if (r.storageProblem) {
          this.logger.warn(
            `Lesson videos were not checked: ${r.storageProblem}`,
          );
        } else if (r.attached.length || r.notInStorage.length) {
          this.logger.log(
            `Lesson videos: ${r.attached.length} switched on, ${r.alreadyHave.length} already had one, ${r.notInStorage.length} not in the bucket yet.`,
          );
        }
      })
      .catch((err: Error) =>
        this.logger.warn(`Lesson videos were not checked: ${err.message}`),
      );
  }

  /** Records a stored video on the lesson (also used by the bulk upload tool). */
  async register(
    lessonId: string,
    currentRaw: unknown,
    stored: LcStoredVideo,
    durationSeconds: number,
  ): Promise<LcPreviewVideo> {
    const current = validatePreviewVideo(currentRaw).value;
    if (!current)
      throw new BadRequestException(
        'This lesson has no preview video record to attach the video to.',
      );
    const next = validatePreviewVideo({ ...current, durationSeconds, stored });
    if (!next.value)
      throw new BadRequestException(
        `The video details were not valid: ${next.errors.join(' ')}`,
      );
    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { previewVideo: json(next.value) },
    });
    return next.value;
  }

  private async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const present = await this.storage.headObject(key);
    if (present && present.sizeBytes === body.length) return; // already there (same content, same key)
    await this.storage.putObject(key, body, contentType);
  }

  private async lessonRow(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        order: true,
        experience: true,
        previewVideo: true,
        course: { select: { slug: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (
      !isLittleCodersSlug(lesson.course.slug) ||
      lesson.experience === null ||
      lesson.experience === undefined
    ) {
      throw new BadRequestException(
        'Only a Little Coders lesson has this preview video.',
      );
    }
    return lesson;
  }
}
