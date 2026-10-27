// FILE PATH: server/src/classroom/recording-library.service.ts
//
// Who may watch which class recording — and the signed URL that lets them.
//
// The recordings sit in a private R2 bucket: nobody gets a link that works
// until THIS service has checked, for that person and that recording, that they
// belong to the class. What it hands back is a signed URL that expires
// (RecordingStorageService), so a copied link stops working on its own.
//
// Who may watch a recording of a class:
//   - a student who is in the class (a batch's students all are — a student who
//     missed the live class catches up from the recording);
//   - for a marketplace booking, its student, or the parent the booked child
//     belongs to;
//   - the teacher who recorded it, or the class's teacher;
//   - an admin.
// A segment is only ever watchable once it is AVAILABLE (the file is in R2 and
// was checked). Anyone else is told "not found", whether or not it exists.
//
// A student finds their recordings in one call (listForStudent). A parent has no
// list of their own: their child's page asks for one booking at a time
// (listForBooking), and plays a part through the same signed-URL call.

import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LessonStatus, RecordingSegmentStatus, Role } from '@prisma/client';
import type { RecordingSegment } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { RecordingStorageService } from './recording-storage.service';
import { RoomDirectoryService } from './room-directory.service';
import { toSegmentView } from './recording.service';
import type { SegmentView } from './recording.service';
import {
  DEMO_ROOM_NAME,
  DEMO_STUDENT_EMAIL,
  DEMO_TEACHER_EMAIL,
  getRoomRef,
  roomForBatchSession,
  roomForLessonRecord,
} from './room-ref.util';

/** Who is asking (from the login token). */
export interface Viewer {
  userId: string;
  role: string;
  email?: string;
}

/** One watchable part of a class. */
export interface RecordingPart {
  id: string;
  /** 1, 2, 3… in the order they were recorded (only watchable parts count). */
  part: number;
  durationSeconds: number | null;
  sizeBytes: number | null;
  recordedAt: Date;
}

/** One class that has something to watch. */
export interface RecordingClass {
  /** Stable key for the class (its classroom). */
  key: string;
  kind: 'LESSON' | 'BOOKING' | 'DEMO';
  /** "Lesson 3: Variables", "Class with Ms Rahman", … */
  title: string;
  courseTitle: string | null;
  lessonNumber: number | null;
  lessonTitle: string | null;
  batchName: string | null;
  teacherName: string;
  teacherAvatarUrl: string | null;
  classStart: Date;
  classEnd: Date | null;
  parts: RecordingPart[];
  /** A recording made by the retired server-side recorder: a plain link. */
  legacyUrl: string | null;
}

export interface MyRecordings {
  recordings: RecordingClass[];
  /** Recorded parts the teacher has not finished uploading yet. */
  processingCount: number;
}

export interface BookingRecordings {
  parts: RecordingPart[];
}

export interface Playback {
  url: string;
  expiresAt: Date;
  durationSeconds: number | null;
}

export interface ClassRecordings {
  room: string;
  storage: { configured: boolean; missing: string[] };
  segments: (SegmentView & { part: number })[];
}

@Injectable()
export class RecordingLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: RecordingStorageService,
    private readonly directory: RoomDirectoryService,
  ) {}

  // ─── A student's recordings ──────────────────────────────────────────────

  async listForStudent(userId: string, email?: string): Promise<MyRecordings> {
    const [lessons, bookings] = await Promise.all([
      this.prisma.scheduledLesson.findMany({
        where: {
          studentUserId: userId,
          status: { not: LessonStatus.CANCELLED },
        },
        select: {
          id: true,
          classType: true,
          teacherId: true,
          start: true,
          end: true,
          batchSessionId: true,
          courseId: true,
          lessonNumber: true,
          recordingUrl: true,
          recordingStatus: true,
          course: { select: { title: true } },
          batch: { select: { name: true } },
          teacher: {
            select: { user: { select: { fullName: true, avatarUrl: true } } },
          },
        },
      }),
      this.prisma.booking.findMany({
        where: { studentUserId: userId },
        select: {
          id: true,
          recordingUrl: true,
          recordingStatus: true,
          shift: {
            select: {
              start: true,
              end: true,
              teacher: {
                select: {
                  user: { select: { fullName: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // A class is its classroom: a 1:1 lesson has a room of its own, a batch's
    // students share one (so each of them finds the same recording).
    const lessonByRoom = new Map(
      lessons.map((l) => [roomForLessonRecord(l), l]),
    );
    const bookingByRoom = new Map(bookings.map((b) => [b.id, b]));
    const isDemoStudent = email?.toLowerCase() === DEMO_STUDENT_EMAIL;
    const rooms = [
      ...lessonByRoom.keys(),
      ...bookingByRoom.keys(),
      ...(isDemoStudent ? [DEMO_ROOM_NAME] : []),
    ];
    if (rooms.length === 0) return { recordings: [], processingCount: 0 };

    const segments = await this.prisma.recordingSegment.findMany({
      where: {
        room: { in: rooms },
        status: {
          in: [
            RecordingSegmentStatus.AVAILABLE,
            RecordingSegmentStatus.UPLOADING,
            RecordingSegmentStatus.RECORDING,
          ],
        },
      },
      orderBy: { startedAt: 'asc' },
    });
    const byRoom = new Map<string, RecordingSegment[]>();
    for (const s of segments) {
      byRoom.set(s.room, [...(byRoom.get(s.room) ?? []), s]);
    }

    const courseIds = [...new Set(lessons.map((l) => l.courseId))];
    const catalog =
      courseIds.length > 0
        ? await this.prisma.lesson.findMany({
            where: { courseId: { in: courseIds } },
            select: { courseId: true, order: true, title: true },
          })
        : [];
    const lessonTitle = new Map(
      catalog.map((c) => [`${c.courseId}:${c.order}`, c.title]),
    );
    const demoTeacher = isDemoStudent
      ? await this.prisma.user.findUnique({
          where: { email: DEMO_TEACHER_EMAIL },
          select: { fullName: true, avatarUrl: true },
        })
      : null;

    const recordings: RecordingClass[] = [];
    let processingCount = 0;

    for (const room of rooms) {
      const all = byRoom.get(room) ?? [];
      const ready = all.filter(
        (s) => s.status === RecordingSegmentStatus.AVAILABLE,
      );
      processingCount += all.length - ready.length;

      const lesson = lessonByRoom.get(room);
      const booking = bookingByRoom.get(room);
      const legacyUrl =
        (lesson?.recordingStatus === 'AVAILABLE'
          ? lesson.recordingUrl
          : null) ??
        (booking?.recordingStatus === 'AVAILABLE'
          ? booking.recordingUrl
          : null);
      if (ready.length === 0 && !legacyUrl) continue;

      const parts: RecordingPart[] = ready.map((s, i) => ({
        id: s.id,
        part: i + 1,
        durationSeconds: s.durationSeconds,
        sizeBytes: s.fileSizeBytes,
        recordedAt: s.startedAt,
      }));

      if (lesson) {
        const title = lessonTitle.get(
          `${lesson.courseId}:${lesson.lessonNumber}`,
        );
        recordings.push({
          key: room,
          kind: 'LESSON',
          title: `Lesson ${lesson.lessonNumber}${title ? `: ${title}` : ''}`,
          courseTitle: lesson.course.title,
          lessonNumber: lesson.lessonNumber,
          lessonTitle: title ?? null,
          batchName: lesson.batch?.name ?? null,
          teacherName: lesson.teacher.user.fullName,
          teacherAvatarUrl: lesson.teacher.user.avatarUrl ?? null,
          classStart: lesson.start,
          classEnd: lesson.end,
          parts,
          legacyUrl,
        });
      } else if (booking) {
        const teacher = booking.shift.teacher.user;
        recordings.push({
          key: room,
          kind: 'BOOKING',
          title: `Class with ${teacher.fullName}`,
          courseTitle: null,
          lessonNumber: null,
          lessonTitle: null,
          batchName: null,
          teacherName: teacher.fullName,
          teacherAvatarUrl: teacher.avatarUrl ?? null,
          classStart: booking.shift.start,
          classEnd: booking.shift.end,
          parts,
          legacyUrl,
        });
      } else {
        // The QA demo classroom: no lesson behind it, so it is dated by its
        // first recording.
        recordings.push({
          key: room,
          kind: 'DEMO',
          title: 'Lumexa Demo Classroom (QA)',
          courseTitle: null,
          lessonNumber: null,
          lessonTitle: null,
          batchName: null,
          teacherName: demoTeacher?.fullName ?? 'Teacher Demo',
          teacherAvatarUrl: demoTeacher?.avatarUrl ?? null,
          classStart: ready[0].startedAt,
          classEnd: null,
          parts,
          legacyUrl: null,
        });
      }
    }

    recordings.sort((a, b) => b.classStart.getTime() - a.classStart.getTime());
    return { recordings, processingCount };
  }

  // ─── Watching one recording ──────────────────────────────────────────────

  /** A signed URL to stream one recording, if this person may watch it. */
  async playback(viewer: Viewer, segmentId: string): Promise<Playback> {
    const seg = await this.prisma.recordingSegment.findUnique({
      where: { id: segmentId },
    });
    if (
      !seg ||
      seg.status !== RecordingSegmentStatus.AVAILABLE ||
      !seg.storagePath ||
      !(await this.canView(viewer, seg))
    ) {
      throw new NotFoundException('Recording not found.');
    }
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException(
        'Recordings cannot be played right now. Please try again later.',
      );
    }
    const signed = await this.storage.createPlaybackUrl(seg.storagePath);
    return {
      url: signed.url,
      expiresAt: signed.expiresAt,
      durationSeconds: seg.durationSeconds,
    };
  }

  private async canView(
    viewer: Viewer,
    seg: RecordingSegment,
  ): Promise<boolean> {
    if (viewer.role === Role.ADMIN) return true;
    if (seg.recordedByUserId && seg.recordedByUserId === viewer.userId) {
      return true;
    }
    return this.canViewRoom(viewer, seg.room);
  }

  /** Whether this person belongs to the class behind a room: an admin, the
   * class's teacher, a student taking part, or a booked child's parent. */
  private async canViewRoom(viewer: Viewer, room: string): Promise<boolean> {
    if (viewer.role === Role.ADMIN) return true;
    const ref = getRoomRef(room);

    try {
      if (viewer.role === Role.TEACHER) {
        return (await this.directory.teacherUserIdOf(room)) === viewer.userId;
      }

      if (viewer.role === Role.STUDENT) {
        if (ref.kind === 'demo') {
          return viewer.email?.toLowerCase() === DEMO_STUDENT_EMAIL;
        }
        if (ref.kind === 'booking') {
          const booking = await this.prisma.booking.findUnique({
            where: { id: ref.bookingId },
            select: { studentUserId: true },
          });
          return booking?.studentUserId === viewer.userId;
        }
        if (ref.kind === 'trial') return false;
        const resolved = await this.directory.resolve(room);
        return resolved.lessons.some((l) => l.studentUserId === viewer.userId);
      }

      if (viewer.role === Role.PARENT && ref.kind === 'booking') {
        const booking = await this.prisma.booking.findUnique({
          where: { id: ref.bookingId },
          select: { student: { select: { parentId: true } } },
        });
        return booking?.student?.parentId === viewer.userId;
      }
    } catch {
      // The class behind the room is gone: nobody but an admin (above) sees it.
      return false;
    }
    return false;
  }

  // ─── One booking's recordings (a parent's view of their child's class) ───

  /** The parts of a marketplace booking's class that this person may watch.
   * Someone who does not belong to the class gets an empty list — the same
   * answer as a class nobody recorded. */
  async listForBooking(
    viewer: Viewer,
    bookingId: string,
  ): Promise<BookingRecordings> {
    // A booking's classroom is named by the booking itself.
    const segments = await this.prisma.recordingSegment.findMany({
      where: { room: bookingId, status: RecordingSegmentStatus.AVAILABLE },
      orderBy: { startedAt: 'asc' },
    });
    if (segments.length === 0) return { parts: [] };

    const belongs = await this.canViewRoom(viewer, bookingId);
    return {
      parts: segments
        .map((s, i) => ({ s, part: i + 1 }))
        .filter(({ s }) => belongs || s.recordedByUserId === viewer.userId)
        .map(({ s, part }) => ({
          id: s.id,
          part,
          durationSeconds: s.durationSeconds,
          sizeBytes: s.fileSizeBytes,
          recordedAt: s.startedAt,
        })),
    };
  }

  // ─── An admin's view of one class ────────────────────────────────────────

  async listForClass(
    kind: 'BOOKING' | 'LESSON' | 'SESSION',
    id: string,
  ): Promise<ClassRecordings> {
    let room: string;
    if (kind === 'SESSION') {
      room = roomForBatchSession(id);
    } else if (kind === 'LESSON') {
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id },
        select: {
          id: true,
          classType: true,
          teacherId: true,
          start: true,
          batchSessionId: true,
        },
      });
      if (!lesson) throw new NotFoundException('Class not found.');
      room = roomForLessonRecord(lesson);
    } else {
      room = id;
    }

    const rows = await this.prisma.recordingSegment.findMany({
      where: { room },
      orderBy: { startedAt: 'asc' },
    });
    const missing = this.storage.missingEnvVars();
    return {
      room,
      storage: { configured: missing.length === 0, missing },
      segments: rows.map((r, i) => ({ ...toSegmentView(r), part: i + 1 })),
    };
  }
}
