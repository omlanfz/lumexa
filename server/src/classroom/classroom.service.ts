import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StudentsService } from '../students/students.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { PayoutsService } from '../payouts/payouts.service';
import { AlertsService } from '../alerts/alerts.service';
import { StripeService } from '../payments/stripe.service';
import {
  getClassWindow,
  computeLateMinutes,
} from '../scheduling/lesson-window.util';
import { LATE_JOIN_GRACE_MINUTES } from '../payouts/payout.constants';
import { LessonStatus, ClassEndReason, SpaceRank } from '@prisma/client';
import { DailyRoomsService } from './daily-rooms.service';
import { RecordingService } from './recording.service';
import type { SegmentView, StartedSegment } from './recording.service';
import { AdmissionService } from './admission.service';
import {
  ClassFinalizationService,
  type ClassOutcome,
} from './class-finalization.service';
import { RoomAccessService } from './room-access.service';
import { RoomDirectoryService } from './room-directory.service';
import { TrialClassroomService } from './trial-classroom.service';
import { BatchSessionsService } from '../batches/batch-sessions.service';
import {
  ADMIN_OBSERVER_PREFIX,
  DEMO_ROOM_NAME,
  DEMO_STUDENT_EMAIL,
  DEMO_TEACHER_EMAIL,
  MAX_PEOPLE_PER_CLASSROOM,
  getRoomRef,
  isLessonRoom,
  isTrialRoom,
  lessonIdFromRoom,
  parseTrialRoom,
  roomForBatchSession,
  roomForLessonRecord,
} from './room-ref.util';

/** How long a person's way into the room stays usable (a class can run long). */
const JOIN_TOKEN_TTL_SECONDS = 3 * 60 * 60;
/** The admin observer's way in. */
const OBSERVER_TOKEN_TTL_SECONDS = 2 * 60 * 60;

export interface EndClassParams {
  outcome?: ClassOutcome;
  reason?: ClassEndReason;
  note?: string;
}

// ─── Temporary QA demo classroom ────────────────────────────────────────────
//
// Lets exactly two seeded accounts (Teacher Demo / Demo Student) jump into a
// shared classroom instantly, with no real booking or scheduled lesson
// involved, purely to test/QA the classroom experience. Deliberately kept
// isolated from Booking/ScheduledLesson/payouts/cron so it can never affect
// real revenue, payout, or admin reporting — remove joinDemoClassroom (and the
// join-demo controller route + frontend buttons) once QA is done. The two
// accounts are named in room-ref.util.ts.

const RANK_THRESHOLDS: { rank: SpaceRank; min: number }[] = [
  { rank: 'STARCHILD', min: 0 },
  { rank: 'EXPLORER', min: 5 },
  { rank: 'COSMONAUT', min: 15 },
  { rank: 'NAVIGATOR', min: 30 },
  { rank: 'CAPTAIN', min: 60 },
  { rank: 'GALAXY_COMMANDER', min: 100 },
];

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
    private schedulingService: SchedulingService,
    private payoutsService: PayoutsService,
    private alertsService: AlertsService,
    private stripeService: StripeService,
    private recordingService: RecordingService,
    private admissionService: AdmissionService,
    private classFinalization: ClassFinalizationService,
    private roomAccess: RoomAccessService,
    private roomDirectory: RoomDirectoryService,
    private batchSessions: BatchSessionsService,
    private trialClassroom: TrialClassroomService,
    private rooms: DailyRoomsService,
  ) {}

  private computeSpaceRank(sessions: number): SpaceRank {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (sessions >= RANK_THRESHOLDS[i].min) return RANK_THRESHOLDS[i].rank;
    }
    return 'STARCHILD';
  }

  /** QA-only: joins DEMO_ROOM_NAME directly, no booking/lesson required.
   * Restricted to the two seeded demo accounts — see the block comment
   * above DEMO_ROOM_NAME for why this is kept separate from the real
   * booking/lesson flows. */
  async joinDemoClassroom(userId: string, email: string | undefined) {
    const normalizedEmail = email?.toLowerCase();
    const isTeacher = normalizedEmail === DEMO_TEACHER_EMAIL;
    const isStudent = normalizedEmail === DEMO_STUDENT_EMAIL;
    if (!isTeacher && !isStudent) {
      throw new ForbiddenException(
        'The demo classroom is only available to the Lumexa QA test accounts.',
      );
    }

    this.rooms.assertConfigured();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const displayName =
      user?.fullName ?? (isTeacher ? 'Teacher Demo' : 'Demo Student');
    const participantName = `${displayName} (${isTeacher ? 'Teacher' : 'Student'})`;

    // (If the demo teacher's account is missing there is nobody to reserve a
    // seat for; the limits still apply.)
    const teacherUserId = await this.roomDirectory
      .teacherUserIdOf(DEMO_ROOM_NAME)
      .catch(() => '');

    // Locked / full / too many devices — same rules as a real class.
    const blocked = await this.checkRoomEntry({
      room: DEMO_ROOM_NAME,
      userId,
      role: isTeacher ? 'TEACHER' : 'STUDENT',
      teacherUserId,
    });
    if (blocked) return blocked;

    // A student the teacher removed must knock and be re-admitted rather
    // than silently rejoining — see AdmissionService.
    if (isStudent) {
      const admission = await this.admissionService.checkJoin(
        DEMO_ROOM_NAME,
        userId,
        displayName,
        'STUDENT',
      );
      if (!admission.ok) {
        return {
          waitingForAdmission: true as const,
          admissionId: admission.admissionId,
          roomName: DEMO_ROOM_NAME,
        };
      }
    }

    const entry = await this.rooms.entryFor({
      room: DEMO_ROOM_NAME,
      userId,
      userName: participantName,
      isOwner: isTeacher,
      ttlSeconds: JOIN_TOKEN_TTL_SECONDS,
    });
    this.roomAccess.scheduleEnforcement(DEMO_ROOM_NAME, teacherUserId);

    return {
      ...entry,
      roomName: DEMO_ROOM_NAME,
      scheduledStart: await this.getDemoRoomStart(),
      classType: 'ONE_TO_ONE' as const,
      roomLocked: await this.roomAccess.isLocked(DEMO_ROOM_NAME),
      maxPeople: MAX_PEOPLE_PER_CLASSROOM,
    };
  }

  /** The room limits and the teacher's lock, as the response a join returns
   * when it must refuse (the browser shows `message` and offers a retry) —
   * or null when this person may come in. A refusal is a normal answer, not
   * an error, the same way "waiting to be let back in" is. */
  private async checkRoomEntry(params: {
    room: string;
    userId: string;
    role: 'TEACHER' | 'STUDENT';
    teacherUserId: string;
  }) {
    const entry = await this.roomAccess.checkEntry(params);
    if (entry.ok) return null;
    return {
      blocked: true as const,
      reason: entry.reason,
      message: entry.message,
      roomName: params.room,
    };
  }

  /** The demo room has no real ScheduledLesson/Booking to anchor its class
   * timer to, so every participant needs to agree on the same "class
   * started at" moment regardless of when each of them personally called
   * this join endpoint — otherwise the teacher and student each see a
   * timer counting from their own join time instead of one shared clock.
   * Daily already tracks that moment for free: the earliest join time among
   * the people in the room is when the meeting began, and every later join
   * sees that same value back. Only the very first joiner (who is about to
   * start the meeting) has nobody to read yet — for them "now" effectively IS
   * that anchor, since they connect within moments of this same call. */
  private async getDemoRoomStart(): Promise<string> {
    try {
      const startedAt = await this.rooms.meetingStartedAt(DEMO_ROOM_NAME);
      if (startedAt) return startedAt.toISOString();
    } catch (err) {
      this.logger.warn(
        `Could not look up the demo room's creation time, falling back to now: ${err}`,
      );
    }
    return new Date().toISOString();
  }

  /** Admin-only: join an already-live class as a silent observer. The token
   * lets the observer receive but never send (no audio, video or screen
   * share to leak into the class — the admin can only watch), and the
   * classroom leaves observers out of its people lists and room limits, so
   * joining truly can't disrupt the session in progress. Rejects if the class
   * isn't actually live right now, mirroring the same "LIVE" definition
   * AdminService uses to show the badge in the first place. */
  async adminJoinLiveClass(
    kind: 'BOOKING' | 'LESSON' | 'SESSION',
    id: string,
  ): Promise<{ token: string; url: string; roomName: string }> {
    this.rooms.assertConfigured();

    let room: string;
    if (kind === 'SESSION') {
      const session = await this.prisma.batchSession.findUnique({
        where: { id },
        select: { id: true, status: true, teacherJoinedAt: true },
      });
      if (
        !session ||
        session.status !== LessonStatus.UPCOMING ||
        !session.teacherJoinedAt
      ) {
        throw new BadRequestException('This class is not currently live.');
      }
      room = roomForBatchSession(session.id);
    } else if (kind === 'LESSON') {
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id },
      });
      if (
        !lesson ||
        lesson.status !== LessonStatus.UPCOMING ||
        !lesson.teacherJoinedAt
      ) {
        throw new BadRequestException('This class is not currently live.');
      }
      room = roomForLessonRecord(lesson);
    } else {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { shift: true },
      });
      const now = new Date();
      if (
        !booking ||
        booking.paymentStatus !== 'PENDING' ||
        now < booking.shift.start ||
        now > booking.shift.end
      ) {
        throw new BadRequestException('This class is not currently live.');
      }
      room = id;
    }

    const entry = await this.rooms.entryFor({
      room,
      userId: `${ADMIN_OBSERVER_PREFIX}${Date.now()}`,
      userName: 'Lumexa Ops (Observer)',
      isOwner: false,
      ttlSeconds: OBSERVER_TOKEN_TTL_SECONDS,
      observer: true,
    });

    return { token: entry.token, url: entry.url, roomName: room };
  }

  /** Dispatches to the marketplace-booking flow or the curriculum
   * scheduled-lesson flow depending on which id was given. */
  async joinLab(
    userId: string,
    dto: {
      bookingId?: string;
      scheduledLessonId?: string;
      batchSessionId?: string;
      trialLeadId?: string;
    },
  ) {
    if (dto.trialLeadId) {
      // A free trial class (the assigned teacher's way in). The guest uses the
      // public, token-based route instead — see TrialController.
      return this.trialClassroom.joinAsTeacher(userId, dto.trialLeadId);
    }
    if (dto.batchSessionId) {
      return this.joinBatchSession(userId, dto.batchSessionId);
    }
    if (dto.scheduledLessonId) {
      return this.joinScheduledLesson(userId, dto.scheduledLessonId);
    }
    if (dto.bookingId) {
      return this.joinBooking(userId, dto.bookingId);
    }
    throw new BadRequestException(
      'Either bookingId, scheduledLessonId, batchSessionId or trialLeadId is required.',
    );
  }

  /** Entry to a batch class by the class itself (what the teacher's dashboard
   * and calendar know it by). Each person still joins through their own row
   * in it: the teacher through any student's, a student through their own — so
   * one set of rules (who may be here, the lock, the limits) applies to all. */
  async joinBatchSession(userId: string, sessionId: string) {
    const session =
      await this.schedulingService.getSessionForClassroom(sessionId);
    const open = session.participants.filter(
      (p) => p.status === LessonStatus.UPCOMING,
    );
    const own = open.find((p) => p.studentUserId === userId);
    const anchor = session.teacher.userId === userId ? open[0] : own;
    if (!anchor) {
      throw new BadRequestException(
        session.teacher.userId === userId
          ? 'There are no students in this class.'
          : 'Access denied: you are not assigned to this classroom.',
      );
    }
    return this.joinScheduledLesson(userId, anchor.id);
  }

  // ─── Curriculum flow: Operations-scheduled recurring lessons ─────────────

  async joinScheduledLesson(userId: string, lessonId: string) {
    const lesson = await this.schedulingService.getLessonForClassroom(lessonId);

    // A batch student's row is their place in a class the whole batch shares.
    // The class — its time, status, teacher and the teacher's arrival — is what
    // decides who may come in; the row only says which student is asking.
    const session = lesson.batchSession;
    const classStatus = session ? session.status : lesson.status;
    const classStart = session ? session.start : lesson.start;
    const classEnd = session ? session.end : lesson.end;
    const teacherUserId = session
      ? session.teacher.userId
      : lesson.teacher.userId;
    const teacherName = session
      ? session.teacher.user.fullName
      : lesson.teacher.user.fullName;

    // A class is never closed by its own scheduled end time — only the
    // teacher manually ending it (see endClass) changes its status away
    // from UPCOMING. So the only time-based gate left is "hasn't opened
    // yet"; once open, the room stays joinable for as long as the lesson
    // is still UPCOMING, however long past its scheduled end that is.
    if (
      classStatus !== LessonStatus.UPCOMING ||
      lesson.status !== LessonStatus.UPCOMING
    ) {
      throw new BadRequestException('This class has already ended.');
    }
    const window = getClassWindow(classStart, classEnd);
    if (window.msUntilStart > 10 * 60 * 1000) {
      const minutesUntilOpen = Math.ceil(
        (window.msUntilStart - 10 * 60 * 1000) / (1000 * 60),
      );
      throw new BadRequestException(
        `Classroom opens 10 minutes before class. Please come back in ${Math.max(minutesUntilOpen, 1)} minute(s).`,
      );
    }

    let participantName = '';
    let role: 'TEACHER' | 'STUDENT';

    if (teacherUserId === userId) {
      participantName = `${teacherName} (Teacher)`;
      role = 'TEACHER';
    } else if (lesson.student.id === userId) {
      participantName = `${lesson.student.fullName} (Student)`;
      role = 'STUDENT';
    } else {
      throw new BadRequestException(
        'Access denied: you are not assigned to this classroom.',
      );
    }

    this.rooms.assertConfigured();

    // A 1:1 class has a room of its own; every student of a BATCH class takes
    // the class's one room (see roomForLessonRecord).
    const roomName = roomForLessonRecord(lesson);

    // The teacher's lock, the 10-people limit and the per-person device limit.
    const blocked = await this.checkRoomEntry({
      room: roomName,
      userId,
      role,
      teacherUserId,
    });
    if (blocked) return blocked;

    // A student the teacher removed must knock and be re-admitted rather
    // than silently rejoining — see AdmissionService.
    if (role === 'STUDENT') {
      const admission = await this.admissionService.checkJoin(
        roomName,
        userId,
        lesson.student.fullName,
        role,
      );
      if (!admission.ok) {
        return {
          waitingForAdmission: true as const,
          admissionId: admission.admissionId,
          roomName,
        };
      }
    }

    // The way in is made before anything is recorded: if the video service is
    // down nobody got in, so no join is logged and no teacher is fined for it.
    // (A person on several devices is one `userId` with a session each — see
    // room-ref.util.ts.)
    const entry = await this.rooms.entryFor({
      room: roomName,
      userId,
      userName: participantName,
      isOwner: role === 'TEACHER',
      ttlSeconds: JOIN_TOKEN_TTL_SECONDS,
    });
    this.roomAccess.scheduleEnforcement(roomName, teacherUserId);

    // When the teacher FIRST came in, read before this join is recorded: a
    // token is also requested when the teacher presses Join, opens a second
    // device or refreshes, and none of those may fine a teacher who was on
    // time. (A class with no join time yet is genuinely being entered first.)
    const firstTeacherArrival = session
      ? session.teacherJoinedAt
      : lesson.teacherJoinedAt;

    await this.schedulingService
      .recordLessonJoin(lessonId, role)
      .catch((err) => {
        this.logger.error(
          `Failed to record join for lesson ${lessonId}: ${err}`,
        );
      });

    // Immediate late-join check — a teacher who joins more than the grace
    // period after the scheduled start is penalized right away rather than
    // waiting for PayoutsService's sweep cron. Idempotent either way. A batch
    // class is one class: one penalty for it, however many students it has.
    if (role === 'TEACHER') {
      const arrivedAt = firstTeacherArrival ?? new Date();
      const lateMinutes = computeLateMinutes(classStart, arrivedAt);
      if (lateMinutes > LATE_JOIN_GRACE_MINUTES) {
        await this.payoutsService
          .triggerLateJoinPenalty(
            session
              ? {
                  teacherId: session.teacherId,
                  batchSessionId: session.id,
                  lateMinutes,
                }
              : {
                  teacherId: lesson.teacher.id,
                  scheduledLessonId: lesson.id,
                  lateMinutes,
                },
          )
          .catch((err) => {
            this.logger.error(
              `Failed to apply late-join penalty for ${session ? `batch class ${session.id}` : `lesson ${lesson.id}`}: ${err}`,
            );
          });
      }
    }

    return {
      ...entry,
      roomName,
      scheduledStart: classStart.toISOString(),
      // The row the person came in through — a teacher entering a batch class by
      // the class's own id learns which student's row stands for them here.
      scheduledLessonId: lesson.id,
      classType: lesson.classType,
      batchName: session?.batch.name ?? null,
      // The teacher's Partially Completed option is only offered once per
      // lesson — disabled on the extra class that option itself creates. For a
      // batch it is the batch's one use of it for this lesson.
      partialCompletionAvailable: session
        ? !(await this.batchSessions.hasPartialCompletion(
            this.prisma,
            session.batchId,
            session.lessonNumber,
          ))
        : !(await this.anyPartialCompletionUsed([lesson])),
      roomLocked: await this.roomAccess.isLocked(roomName),
      maxPeople: MAX_PEOPLE_PER_CLASSROOM,
    };
  }

  private async anyPartialCompletionUsed(
    lessons: {
      studentUserId: string;
      courseId: string;
      lessonNumber: number;
    }[],
  ): Promise<boolean> {
    for (const l of lessons) {
      if (
        await this.schedulingService.hasPartialCompletion(
          l.studentUserId,
          l.courseId,
          l.lessonNumber,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  // ─── Marketplace flow: booked shift ───────────────────────────────────────

  async joinBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        studentUser: true,
        shift: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found.');
    }

    // ─── TIME WINDOW CHECK ───────────────────────────────────────────────────
    // Allow joining 10 minutes before start, block after class end
    const now = new Date();
    const classStart = new Date(booking.shift.start);
    const classEnd = new Date(booking.shift.end);
    const joinWindowStart = new Date(classStart.getTime() - 10 * 60 * 1000);

    if (now < joinWindowStart) {
      const minutesUntilOpen = Math.ceil(
        (joinWindowStart.getTime() - now.getTime()) / (1000 * 60),
      );
      throw new BadRequestException(
        `Classroom opens 10 minutes before class. Please come back in ${minutesUntilOpen} minute(s).`,
      );
    }

    if (now > classEnd) {
      throw new BadRequestException('This class has already ended.');
    }

    // ─── IDENTIFY PARTICIPANT ────────────────────────────────────────────────
    let participantName = '';
    let isStudent = false;
    let studentDisplayName = '';

    if (booking.shift.teacher.userId === userId) {
      participantName = booking.shift.teacher.user.fullName + ' (Teacher)';
    } else if (booking.student?.parentId === userId) {
      participantName = booking.student.name + ' (Student)';
      isStudent = true;
      studentDisplayName = booking.student.name;
    } else if (booking.studentUser?.id === userId) {
      participantName = booking.studentUser.fullName + ' (Student)';
      isStudent = true;
      studentDisplayName = booking.studentUser.fullName;
    } else {
      throw new BadRequestException(
        'Access denied: you are not assigned to this classroom.',
      );
    }

    // The teacher's lock, the 10-people limit and the per-person device limit.
    this.rooms.assertConfigured();
    const blocked = await this.checkRoomEntry({
      room: bookingId,
      userId,
      role: isStudent ? 'STUDENT' : 'TEACHER',
      teacherUserId: booking.shift.teacher.userId,
    });
    if (blocked) return blocked;

    // A student the teacher removed must knock and be re-admitted rather
    // than silently rejoining — see AdmissionService.
    if (isStudent) {
      const admission = await this.admissionService.checkJoin(
        bookingId,
        userId,
        studentDisplayName,
        'STUDENT',
      );
      if (!admission.ok) {
        return {
          waitingForAdmission: true as const,
          admissionId: admission.admissionId,
          roomName: bookingId,
        };
      }
    }

    // ─── GET INTO THE DAILY ROOM ─────────────────────────────────────────────
    // The booking id is the room name — unique per session. The token is valid
    // for 3 hours at most.
    const entry = await this.rooms.entryFor({
      room: bookingId,
      userId,
      userName: participantName,
      isOwner: !isStudent,
      ttlSeconds: JOIN_TOKEN_TTL_SECONDS,
    });
    this.roomAccess.scheduleEnforcement(
      bookingId,
      booking.shift.teacher.userId,
    );

    // Recording is never automatic — it only starts when the teacher clicks
    // Record in the classroom UI (see startTeacherRecording below).

    return {
      ...entry,
      roomName: bookingId,
      scheduledStart: booking.shift.start.toISOString(),
      // Marketplace bookings are always 1:1 sessions.
      classType: 'ONE_TO_ONE' as const,
      roomLocked: await this.roomAccess.isLocked(bookingId),
      maxPeople: MAX_PEOPLE_PER_CLASSROOM,
    };
  }

  // ─── Recording (made in the teacher's browser, one segment per Record) ───
  //
  // The recording itself is a WebM file the TEACHER'S BROWSER makes and uploads
  // straight to R2; RecordingService keeps the books (see that file's header).
  // This class only enforces "only the teacher of this room" before delegating
  // — and mirrors "a recording is running" into the room's shared state (Daily's
  // meeting session data), so the REC badge shows for everyone in the class (a
  // student's browser must not be able to write it, so only the server does).

  /** Teacher clicks Record. Never called automatically — see joinBooking/
   * joinScheduledLesson, which don't start recording on their own. `segmentId`
   * is the id their browser chose for this recording (so a retry is harmless). */
  async startTeacherRecording(
    userId: string,
    room: string,
    segmentId?: string,
  ): Promise<{ ok: true } & StartedSegment> {
    await this.assertTeacherOfRoom(userId, room);
    if (isTrialRoom(room)) {
      throw new BadRequestException(
        'Trial classes are not recorded. Recording is available in regular Lumexa classes.',
      );
    }
    const started = await this.recordingService.startSegment(
      room,
      userId,
      segmentId,
    );
    await this.mirrorRecordingFlag(room);
    return { ok: true, ...started };
  }

  /** The teacher's browser stopped recording (Stop, the length cap, or the
   * browser's own "Stop sharing"). */
  async stopTeacherRecording(
    userId: string,
    room: string,
    segmentId: string,
    info: { durationMs?: number; mimeType?: string } = {},
  ): Promise<{ ok: true; segment: SegmentView }> {
    await this.assertTeacherOfRoom(userId, room);
    const segment = await this.recordingService.stopSegment(
      room,
      userId,
      segmentId,
      info,
    );
    await this.mirrorRecordingFlag(room);
    return { ok: true, segment };
  }

  /** The teacher gives a recording up before uploading it. */
  async discardTeacherRecording(
    userId: string,
    room: string,
    segmentId: string,
  ): Promise<{ ok: true; segment: SegmentView }> {
    await this.assertTeacherOfRoom(userId, room);
    const segment = await this.recordingService.discardSegment(
      room,
      userId,
      segmentId,
    );
    await this.mirrorRecordingFlag(room);
    return { ok: true, segment };
  }

  /** Puts `recording: true|false` in the live room's shared state, for the REC
   * badge. Best effort: nobody may be in the room (the QA demo room between
   * sessions), and a recording must never fail because a badge could not be
   * updated. */
  private async mirrorRecordingFlag(room: string): Promise<void> {
    try {
      const recording = await this.recordingService.hasActiveSegment(room);
      await this.rooms.setClassState(room, { recording });
    } catch (err) {
      this.logger.debug(
        `Room ${room} is not live, recording flag not mirrored: ${err}`,
      );
    }
  }

  /**
   * Capture a marketplace Booking's payment and award session gems/badges,
   * once the class is confirmed complete. Idempotent — safe to call
   * repeatedly for the same booking (checks paymentStatus === 'PENDING'
   * first). Called by the sweep cron below once the class's scheduled end has
   * passed — the class having actually ended is what matters, not whether it
   * was recorded (recording is optional and the teacher's own action).
   */
  private async finalizeBookingIfDue(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking?.paymentIntentId || booking.paymentStatus !== 'PENDING')
      return;

    await this.stripeService.capturePayment(booking.paymentIntentId);
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'CAPTURED' },
    });
    this.logger.log(`Payment captured for booking ${bookingId}`);

    if (!booking.studentUserId) return;

    const updatedUser = await this.prisma.user.update({
      where: { id: booking.studentUserId },
      data: { totalSessions: { increment: 1 } },
      select: { totalSessions: true, spaceRank: true },
    });
    const isFirst = updatedUser.totalSessions === 1;
    const newRank = this.computeSpaceRank(updatedUser.totalSessions);
    const rankChanged = newRank !== updatedUser.spaceRank;
    if (rankChanged) {
      await this.prisma.user.update({
        where: { id: booking.studentUserId },
        data: { spaceRank: newRank },
      });
      await this.studentsService.awardGems(
        booking.studentUserId,
        15,
        'RANK_UP',
        `Ranked up to ${newRank}`,
      );
    }
    const gemAmount = isFirst ? 15 : 5;
    const gemType = isFirst ? 'FIRST_SESSION' : 'SESSION_COMPLETE';
    const gemDesc = isFirst
      ? 'First session bonus'
      : 'Session completion reward';
    await Promise.all([
      this.studentsService.awardGems(
        booking.studentUserId,
        gemAmount,
        gemType,
        gemDesc,
      ),
      this.studentsService.checkAndAwardBadges(booking.studentUserId),
    ]);
  }

  /**
   * Captures the payment of every marketplace class whose scheduled end has
   * passed, whether or not anybody recorded it. Bounded lookback keeps this a
   * cheap scan; finalizeBookingIfDue's own PENDING check makes re-running it
   * harmless.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweepDueBookingPayments() {
    const lookbackFloor = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await this.prisma.booking.findMany({
      where: {
        paymentStatus: 'PENDING',
        shift: { end: { lt: new Date(), gte: lookbackFloor } },
      },
      select: { id: true },
      take: 200,
    });
    for (const { id } of candidates) {
      try {
        await this.finalizeBookingIfDue(id);
      } catch (err) {
        this.logger.error(`Failed to finalize booking ${id}: ${err}`);
      }
    }
  }

  // ─── Teacher-only in-room controls ─────────────────────────────────────────
  //
  // Everything below is invoked from the classroom's Participants panel /
  // Class Controls menu and requires the caller to be the teacher that owns
  // this room (see assertTeacherOfRoom). Muting people, stopping a screen share
  // and locking a microphone are not here: the teacher's own browser does those
  // directly through Daily — the teacher's meeting token is the room's owner
  // token, which is what lets Daily accept them (and refuse them from anyone
  // else). What stays on the server is what must not be left to a browser:
  // removing someone (with the knock-to-rejoin bookkeeping), the room lock and
  // the shared class state.

  /** Room names are `lesson-<scheduledLessonId>` (a 1:1 class),
   * `batch-session-<sessionId>` (a batch class; the old
   * `batch-<teacherId>-<start>` still resolves), a raw bookingId (marketplace)
   * or the demo room — see RoomDirectoryService. */
  private async getRoomTeacherUserId(roomName: string): Promise<string> {
    return this.roomDirectory.teacherUserIdOf(roomName);
  }

  private async assertTeacherOfRoom(
    userId: string,
    roomName: string,
  ): Promise<void> {
    const teacherUserId = await this.getRoomTeacherUserId(roomName);
    if (teacherUserId !== userId) {
      throw new ForbiddenException(
        'Only the teacher can manage this classroom.',
      );
    }
  }

  /** Public wrapper for services split out of this one (AdmissionService's
   * teacher-only endpoints, reached only via ClassroomController) that need
   * the same "is this caller the teacher of this room" check. */
  async assertTeacherOfRoomPublic(
    userId: string,
    roomName: string,
  ): Promise<void> {
    await this.assertTeacherOfRoom(userId, roomName);
  }

  /** Removes a person from the room — from every device they are in from — and
   * makes them knock to come back (see AdmissionService). `targetUserId` is the
   * person's user id (what Daily calls their `user_id`). */
  async removeParticipant(
    userId: string,
    room: string,
    targetUserId: string,
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    if (targetUserId === userId) {
      throw new BadRequestException(
        'You cannot remove yourself from your own class.',
      );
    }

    const connections = (await this.rooms.listPeople(room)).filter(
      (c) => c.userId === targetUserId,
    );
    if (connections.length === 0) return { ok: true }; // already gone

    const displayName =
      connections[0].name.replace(/\s*\((Teacher|Student)\)\s*$/i, '').trim() ||
      connections[0].name ||
      'Student';
    await this.admissionService.markRemoved(
      room,
      targetUserId,
      displayName,
      'STUDENT',
    );

    await this.rooms.removeConnections(
      room,
      connections.map((c) => c.sessionId),
    );
    return { ok: true };
  }

  /** How long after the scheduled start a teacher must wait before End
   * Class becomes clickable at all — guards against an accidental tap
   * seconds into class. Server-enforced (not just a disabled button) since
   * the frontend gate alone would just be advisory. */
  private static readonly END_CLASS_MIN_MINUTES_AFTER_START = 10;

  private assertEndClassWindowOpen(scheduledStart: Date): void {
    const elapsedMs = Date.now() - scheduledStart.getTime();
    if (
      elapsedMs <
      ClassroomService.END_CLASS_MIN_MINUTES_AFTER_START * 60_000
    ) {
      const remaining = Math.ceil(
        (ClassroomService.END_CLASS_MIN_MINUTES_AFTER_START * 60_000 -
          elapsedMs) /
          60_000,
      );
      throw new BadRequestException(
        `You can end this class ${remaining} minute(s) from now, once it's been running for ${ClassroomService.END_CLASS_MIN_MINUTES_AFTER_START} minutes.`,
      );
    }
  }

  /**
   * Teacher ends the class. For a curriculum (ScheduledLesson) class they must
   * choose one of exactly three outcomes — Completed, Partially Completed or
   * Incomplete — and everything that follows (teacher earning, student
   * balance, schedule, recording, notifications) is done by
   * ClassFinalizationService, the same code an admin correction and the
   * 75-minute failsafe use. This method only authorises the caller and
   * enforces the "10 minutes after start" window.
   *
   * The legacy Booking (marketplace) flow has no outcome/earning workflow — it
   * just closes the room, recording an end reason if one was given.
   */
  async endClass(
    userId: string,
    room: string,
    params: EndClassParams = {},
  ): Promise<{
    ok: true;
    status?: LessonStatus;
    lessons?: { lessonId: string; status: LessonStatus }[];
  }> {
    const { outcome, reason, note } = params;
    await this.assertTeacherOfRoom(userId, room);

    let status: LessonStatus | undefined;
    let lessons: { lessonId: string; status: LessonStatus }[] | undefined;

    const roomKind = getRoomRef(room).kind;
    if (roomKind === 'session' || roomKind === 'batch') {
      // A batch is ONE class with one teacher and several students, each of
      // whom has their own row in it (their own attendance, outcome and
      // ledger). The teacher ends the class once; the class is finalized once.
      const resolved = await this.roomDirectory.resolve(room);
      if (!outcome) {
        throw new BadRequestException(
          'Choose Completed, Partially Completed or Incomplete to end this class.',
        );
      }
      const sessionId = resolved.batchSessionId;
      const batchClass = sessionId
        ? await this.prisma.batchSession.findUnique({
            where: { id: sessionId },
            select: { status: true, start: true },
          })
        : null;
      if (!sessionId || !batchClass) {
        throw new BadRequestException('Classroom not found.');
      }
      // A repeat of an already-applied request (double click / retry) must
      // stay a harmless success, so only gate classes that are still open.
      if (batchClass.status === LessonStatus.UPCOMING) {
        this.assertEndClassWindowOpen(batchClass.start);
      }
      const result = await this.classFinalization.finalizeBatchSession(
        sessionId,
        { outcome, reason, note, actor: { role: 'TEACHER', userId } },
      );
      status = result.status;
      lessons = result.lessons.map((l) => ({
        lessonId: l.lessonId,
        status: l.status,
      }));
    } else if (isLessonRoom(room)) {
      const lessonId = lessonIdFromRoom(room);
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id: lessonId },
      });
      if (!lesson) throw new BadRequestException('Classroom not found.');
      if (!outcome) {
        throw new BadRequestException(
          'Choose Completed, Partially Completed or Incomplete to end this class.',
        );
      }
      // A repeat of an already-applied request (double click / retry) must
      // stay a harmless success, so only gate classes that are still open.
      if (lesson.status === LessonStatus.UPCOMING) {
        this.assertEndClassWindowOpen(lesson.start);
      }
      ({ status } = await this.classFinalization.finalizeLesson(lessonId, {
        outcome,
        reason,
        note,
        actor: { role: 'TEACHER', userId },
      }));
    } else if (isTrialRoom(room)) {
      // A free trial: close the room. No outcome workflow, earning or lesson
      // consumption — if both sides took part the trial is recorded Completed,
      // otherwise the admin marks it Completed or Missed.
      await this.trialClassroom.markEnded(parseTrialRoom(room)!, userId);
      await this.closeRoom(room);
      await this.roomAccess.setLocked(room, false, userId).catch(() => {});
    } else if (room !== DEMO_ROOM_NAME) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: room },
        include: { shift: true },
      });
      if (booking) this.assertEndClassWindowOpen(booking.shift.start);
      await this.recordingService.stopActiveSegmentIfAny(room);
      await this.recordingService.finalizeAtClassEnd(room);
      if (reason) {
        await this.prisma.booking.update({
          where: { id: room },
          data: { endReason: reason, endNote: note?.trim() || null },
        });
      }
      await this.closeRoom(room);
    } else {
      await this.recordingService.stopActiveSegmentIfAny(room);
      await this.closeRoom(room);
      // The demo room has a fixed name, so unlike a real class it would stay
      // locked for the next QA session.
      await this.roomAccess.setLocked(room, false, userId).catch(() => {});
    }

    return { ok: true, status, ...(lessons ? { lessons } : {}) };
  }

  /** Closes the Daily room, which disconnects everyone still in it. */
  private async closeRoom(room: string): Promise<void> {
    await this.rooms.deleteRoom(room).catch((err) => {
      // Room may already be empty/gone — ending the class record still
      // succeeded above, which is what matters.
      this.logger.debug(`Could not close the video room ${room}: ${err}`);
    });
  }

  /** Merges into the room's shared state (Daily's meeting session data) — the
   * source of truth for classroom-wide settings (chat lock, "students muted")
   * that every participant's browser follows. Only these two settings can be
   * changed this way: the recording flag and the room lock have their own
   * endpoints and are owned by the server. */
  async updateClassroomState(
    userId: string,
    room: string,
    patch: { chatLocked?: boolean; studentsMuted?: boolean },
  ): Promise<{ ok: true; state: Record<string, boolean> }> {
    await this.assertTeacherOfRoom(userId, room);
    const allowed: Record<string, boolean> = {};
    if (typeof patch?.chatLocked === 'boolean') {
      allowed.chatLocked = patch.chatLocked;
    }
    if (typeof patch?.studentsMuted === 'boolean') {
      allowed.studentsMuted = patch.studentsMuted;
    }
    if (Object.keys(allowed).length === 0) return { ok: true, state: allowed };
    try {
      await this.rooms.setClassState(room, allowed);
    } catch (err) {
      // The teacher's screen has already changed; tell it the change did not
      // reach the class so it can show that and let them try again.
      this.logger.warn(`Could not update the class state of ${room}: ${err}`);
      throw new ServiceUnavailableException(
        'Could not update the class settings right now. Please try again.',
      );
    }
    return { ok: true, state: allowed };
  }

  /** Teacher-only: lock or unlock the classroom. While it is locked no student
   * can join (see RoomAccessService); people already inside stay. The database
   * decides; the room's shared state only mirrors it so every screen updates at
   * once (nobody may be in the room yet, which is fine). */
  async setRoomLocked(
    userId: string,
    room: string,
    locked: boolean,
  ): Promise<{ ok: true; locked: boolean }> {
    await this.assertTeacherOfRoom(userId, room);
    const result = await this.roomAccess.setLocked(room, locked, userId);
    await this.rooms
      .setClassState(room, { roomLocked: result.locked })
      .catch((err) =>
        this.logger.debug(
          `Room ${room} is not live yet, lock state not mirrored: ${err}`,
        ),
      );
    return { ok: true, locked: result.locked };
  }
}
