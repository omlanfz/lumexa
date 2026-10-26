import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
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
import {
  ClassType,
  LessonStatus,
  RecordingStatus,
  ClassEndReason,
  SpaceRank,
} from '@prisma/client';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk';
import type { ParticipantInfo } from 'livekit-server-sdk';
import { RecordingService } from './recording.service';
import { AdmissionService } from './admission.service';
import {
  ClassFinalizationService,
  type ClassOutcome,
} from './class-finalization.service';
import { RoomAccessService } from './room-access.service';
import { RoomDirectoryService } from './room-directory.service';
import { BatchSessionsService } from '../batches/batch-sessions.service';
import {
  DEMO_ROOM_NAME,
  DEMO_STUDENT_EMAIL,
  DEMO_TEACHER_EMAIL,
  MAX_PEOPLE_PER_CLASSROOM,
  buildIdentity,
  getRoomRef,
  isCurriculumRoom,
  isLessonRoom,
  lessonIdFromRoom,
  personKey,
  roomForBatchSession,
  roomForLessonRecord,
  sanitizeDeviceId,
} from './room-ref.util';

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
  async joinDemoClassroom(
    userId: string,
    email: string | undefined,
    deviceId?: unknown,
  ) {
    const normalizedEmail = email?.toLowerCase();
    const isTeacher = normalizedEmail === DEMO_TEACHER_EMAIL;
    const isStudent = normalizedEmail === DEMO_STUDENT_EMAIL;
    if (!isTeacher && !isStudent) {
      throw new ForbiddenException(
        'The demo classroom is only available to the Lumexa QA test accounts.',
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new BadRequestException('Video service is not configured.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const displayName =
      user?.fullName ?? (isTeacher ? 'Teacher Demo' : 'Demo Student');
    const participantName = `${displayName} (${isTeacher ? 'Teacher' : 'Student'})`;
    const device = sanitizeDeviceId(deviceId);

    // Locked / full / too many devices — same rules as a real class.
    const entry = await this.checkRoomEntry({
      room: DEMO_ROOM_NAME,
      userId,
      role: isTeacher ? 'TEACHER' : 'STUDENT',
      deviceId: device,
      // (If the demo teacher's account is missing there is nobody to reserve
      // a seat for; the limits still apply.)
      teacherUserId: await this.roomDirectory
        .teacherUserIdOf(DEMO_ROOM_NAME)
        .catch(() => ''),
    });
    if (entry) return entry;

    // A student the teacher removed must knock and be re-admitted rather
    // than silently rejoining — see AdmissionService. Without this, LiveKit
    // itself rejects the reconnect ("invalid token: revoked") because the
    // identity is still banned from the room after removeParticipant, even
    // though this is a brand-new JWT.
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

    const at = new AccessToken(apiKey, apiSecret, {
      identity: buildIdentity(userId, device),
      name: participantName,
      ttl: '3h',
    });
    at.addGrant({
      roomJoin: true,
      room: DEMO_ROOM_NAME,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
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
    deviceId: string;
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
   * LiveKit already tracks that moment for free: `creationTimeMs` is set
   * once, the instant the room's first participant actually connects, and
   * every later join sees that same value back. Only the very first
   * joiner (who is about to create the room) has no existing room to read
   * yet — for them "now" effectively IS that anchor, since LiveKit creates
   * the room within moments of this same connection. */
  private async getDemoRoomStart(): Promise<string> {
    try {
      const client = this.getRoomServiceClient();
      const [room] = await client.listRooms([DEMO_ROOM_NAME]);
      if (room?.creationTimeMs) {
        return new Date(Number(room.creationTimeMs)).toISOString();
      }
    } catch (err) {
      this.logger.warn(
        `Could not look up the demo room's creation time, falling back to now: ${err}`,
      );
    }
    return new Date().toISOString();
  }

  /** Admin-only: join an already-live class as a silent observer. `hidden:
   * true` keeps this participant out of the teacher/student's own
   * `useParticipants()` list and `canPublish: false` means there is no
   * audio/video/screen-share to ever leak into the class — the admin can
   * only watch (and, via data channel, use chat) — so joining truly can't
   * disrupt the session in progress. Rejects if the class isn't actually
   * live right now, mirroring the same "LIVE" definition AdminService uses
   * to show the badge in the first place. */
  async adminJoinLiveClass(
    kind: 'BOOKING' | 'LESSON' | 'SESSION',
    id: string,
  ): Promise<{ token: string; url: string | undefined; roomName: string }> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret)
      throw new BadRequestException('Video service is not configured.');

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

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `admin-observer-${Date.now()}`,
      name: 'Lumexa Ops (Observer)',
      ttl: '2h',
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: false,
      canSubscribe: true,
      canPublishData: true,
      hidden: true,
    });

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName: room,
    };
  }

  async retryRecordingMerge(
    kind: 'BOOKING' | 'LESSON' | 'SESSION',
    id: string,
  ): Promise<{ ok: true }> {
    if (kind === 'SESSION') {
      // The recording belongs to the class's room; any student's row in it
      // is the way in (every row mirrors the one recording).
      const anchor = await this.prisma.scheduledLesson.findFirst({
        where: { batchSessionId: id, status: { not: LessonStatus.CANCELLED } },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      if (!anchor) throw new BadRequestException('Class not found.');
      return this.recordingService.retryMerge('lesson', anchor.id);
    }
    return this.recordingService.retryMerge(
      kind === 'LESSON' ? 'lesson' : 'booking',
      id,
    );
  }

  /** Dispatches to the marketplace-booking flow or the curriculum
   * scheduled-lesson flow depending on which id was given. */
  async joinLab(
    userId: string,
    dto: {
      bookingId?: string;
      scheduledLessonId?: string;
      batchSessionId?: string;
      deviceId?: string;
    },
  ) {
    if (dto.batchSessionId) {
      return this.joinBatchSession(userId, dto.batchSessionId, dto.deviceId);
    }
    if (dto.scheduledLessonId) {
      return this.joinScheduledLesson(
        userId,
        dto.scheduledLessonId,
        dto.deviceId,
      );
    }
    if (dto.bookingId) {
      return this.joinBooking(userId, dto.bookingId, dto.deviceId);
    }
    throw new BadRequestException(
      'Either bookingId, scheduledLessonId or batchSessionId is required.',
    );
  }

  /** Entry to a batch class by the class itself (what the teacher's dashboard
   * and calendar know it by). Each person still joins through their own row
   * in it: the teacher through any student's, a student through their own — so
   * one set of rules (who may be here, the lock, the limits) applies to all. */
  async joinBatchSession(userId: string, sessionId: string, deviceId?: unknown) {
    const session = await this.schedulingService.getSessionForClassroom(sessionId);
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
    return this.joinScheduledLesson(userId, anchor.id, deviceId);
  }

  // ─── Curriculum flow: Operations-scheduled recurring lessons ─────────────

  async joinScheduledLesson(
    userId: string,
    lessonId: string,
    deviceId?: unknown,
  ) {
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

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new BadRequestException('Video service is not configured.');
    }

    // A 1:1 class has a room of its own; every student of a BATCH class takes
    // the class's one room (see roomForLessonRecord).
    const roomName = roomForLessonRecord(lesson);
    const device = sanitizeDeviceId(deviceId);

    // The teacher's lock, the 10-people limit and the per-person device limit.
    const blocked = await this.checkRoomEntry({
      room: roomName,
      userId,
      role,
      deviceId: device,
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

    const at = new AccessToken(apiKey, apiSecret, {
      // One identity per device/tab: the same person can be in the room from
      // several at once (see room-ref.util.ts).
      identity: buildIdentity(userId, device),
      name: participantName,
      ttl: '3h',
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

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
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
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

  async joinBooking(userId: string, bookingId: string, deviceId?: unknown) {
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
    const device = sanitizeDeviceId(deviceId);
    const blocked = await this.checkRoomEntry({
      room: bookingId,
      userId,
      role: isStudent ? 'STUDENT' : 'TEACHER',
      deviceId: device,
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

    // ─── GENERATE LIVEKIT TOKEN ──────────────────────────────────────────────
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new BadRequestException('Video service is not configured.');
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: buildIdentity(userId, device),
      name: participantName,
      ttl: '3h', // Token valid for 3 hours max
    });

    at.addGrant({
      roomJoin: true,
      room: bookingId, // Use bookingId as the room name — unique per session
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Recording is never automatic — it only starts when the teacher clicks
    // Record in the classroom UI (see startTeacherRecording below).

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName: bookingId,
      scheduledStart: booking.shift.start.toISOString(),
      // Marketplace bookings are always 1:1 sessions.
      classType: 'ONE_TO_ONE' as const,
      roomLocked: await this.roomAccess.isLocked(bookingId),
      maxPeople: MAX_PEOPLE_PER_CLASSROOM,
    };
  }

  // ─── Recording (teacher-triggered, segment-based) ────────────────────────
  //
  // The actual egress/S3/FFmpeg pipeline now lives in RecordingService (see
  // that file's header comment for why it's segment-based and for the root
  // cause of the historical "Recording is not configured" 400). This class
  // just enforces "only the teacher of this room may start/stop it" before
  // delegating.

  /** Teacher clicks Record. Never called automatically — see joinBooking/
   * joinScheduledLesson, which don't start recording on their own. */
  async startTeacherRecording(
    userId: string,
    room: string,
  ): Promise<{ ok: true; recordingStatus: RecordingStatus }> {
    await this.assertTeacherOfRoom(userId, room);
    const { recordingStatus } = await this.recordingService.startSegment(room);
    return { ok: true, recordingStatus };
  }

  async stopTeacherRecording(
    userId: string,
    room: string,
  ): Promise<{ ok: true; recordingStatus: RecordingStatus }> {
    await this.assertTeacherOfRoom(userId, room);
    const { recordingStatus } = await this.recordingService.stopSegment(room);
    return { ok: true, recordingStatus };
  }

  /**
   * Handle LiveKit webhook events. `egress_ended` updates the matching
   * RecordingSegment's status (see RecordingService.handleEgressEnded) —
   * the final, merged recording is only ever marked AVAILABLE once every
   * segment has settled and RecordingService's merge sweep has actually
   * concatenated and uploaded them.
   */
  async handleLiveKitWebhook(body: any, authHeader: string): Promise<void> {
    try {
      const { WebhookReceiver } = await import('livekit-server-sdk');
      const receiver = new WebhookReceiver(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );

      const event = await receiver.receive(JSON.stringify(body), authHeader);

      if (event.event === 'participant_joined') {
        await this.enforceRoomLimits(event);
        return;
      }

      if (event.event === 'egress_ended') {
        const room = event.egressInfo?.roomName;
        if (!room) return;

        await this.recordingService.handleEgressEnded(event.egressInfo as any);

        if (isCurriculumRoom(room)) return; // no payment/gem flow for curriculum lessons
        await this.finalizeBookingIfDue(room);
      }
    } catch (err) {
      this.logger.error(`Webhook processing error: ${err}`);
      // Don't throw — webhook endpoints should always return 200
    }
  }

  /** A join token is issued before the person actually connects, so the
   * limits checked then (the teacher's lock, 10 people, 3 devices each) can be
   * outrun: a token issued a moment before the teacher locked, or two
   * students racing for the last seat. This is the second line — as soon as
   * LiveKit reports someone connected, anyone who should not be there is told
   * why and removed. Rooms that are not Lumexa classrooms are ignored. */
  private async enforceRoomLimits(event: {
    room?: { name?: string };
    participant?: {
      identity?: string;
      kind?: number;
      joinedAt?: bigint;
      joinedAtMs?: bigint;
    };
  }): Promise<void> {
    const room = event.room?.name;
    const participant = event.participant;
    if (!room || !participant?.identity) return;

    let teacherUserId: string;
    try {
      teacherUserId = await this.roomDirectory.teacherUserIdOf(room);
    } catch {
      return; // not one of our classrooms
    }

    const joinedAtMs =
      Number(participant.joinedAtMs ?? 0n) ||
      Number(participant.joinedAt ?? 0n) * 1000;
    await this.roomAccess.enforceAfterJoin({
      room,
      identity: participant.identity,
      joinedAtMs: joinedAtMs || Date.now(),
      kind: Number(participant.kind ?? 0),
      teacherUserId,
    });
  }

  /**
   * Capture a marketplace Booking's payment and award session gems/badges,
   * once the class is confirmed complete. Idempotent — safe to call
   * repeatedly for the same booking (checks paymentStatus === 'PENDING'
   * first). Called from two places since recording is now optional and
   * teacher-triggered rather than automatic: the Egress webhook (when a
   * recording did happen) AND the sweep cron below (when it didn't) —
   * either way, the class having actually ended is what matters, not
   * whether it was recorded.
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
   * Safety net for the marketplace flow now that recording is optional and
   * teacher-triggered: a class whose scheduled end has passed still needs
   * its payment captured even if nobody ever clicked Record. Bounded
   * lookback keeps this a cheap scan; finalizeBookingIfDue's own PENDING
   * check makes re-running it harmless.
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
  // Class Controls menu. All of it requires the caller to be the teacher
  // that owns this room (see assertTeacherOfRoom) and talks to the LiveKit
  // server API directly — the client never gets these credentials.

  private getRoomServiceClient(): RoomServiceClient {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) {
      throw new BadRequestException('Video service is not configured.');
    }
    return new RoomServiceClient(url, apiKey, apiSecret);
  }

  /** Room names are `lesson-<scheduledLessonId>` (a 1:1 class),
   * `batch-<teacherId>-<start>` (a batch), a raw bookingId (marketplace) or the
   * demo room — see RoomDirectoryService. */
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

  /** Every connection of one person currently in the room. A person may be in
   * from several devices at once (see room-ref.util.ts), and a teacher's
   * action on them — mute, stop sharing, remove — applies to all of them, so
   * `identity` may be their userId or any one of their identities. */
  private async connectionsOf(
    client: RoomServiceClient,
    room: string,
    identity: string,
  ): Promise<ParticipantInfo[]> {
    const key = personKey(identity);
    const all = await client.listParticipants(room);
    return all.filter((p) => personKey(p.identity) === key);
  }

  async muteParticipant(
    userId: string,
    room: string,
    identity: string,
    kind: 'audio' | 'video',
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    const client = this.getRoomServiceClient();
    const source =
      kind === 'audio' ? TrackSource.MICROPHONE : TrackSource.CAMERA;
    for (const c of await this.connectionsOf(client, room, identity)) {
      const track = c.tracks.find((t) => t.source === source);
      if (track && !track.muted) {
        await client.mutePublishedTrack(room, c.identity, track.sid, true);
      }
    }
    return { ok: true };
  }

  async muteAllParticipants(
    userId: string,
    room: string,
  ): Promise<{ ok: true; mutedCount: number }> {
    await this.assertTeacherOfRoom(userId, room);
    const client = this.getRoomServiceClient();
    const participants = await client.listParticipants(room);
    let mutedCount = 0;
    for (const p of participants) {
      if (personKey(p.identity) === userId) continue; // never mute the teacher (on any device)
      const micTrack = p.tracks.find(
        (t) => t.source === TrackSource.MICROPHONE,
      );
      if (micTrack && !micTrack.muted) {
        await client.mutePublishedTrack(room, p.identity, micTrack.sid, true);
        mutedCount++;
      }
    }
    return { ok: true, mutedCount };
  }

  /** Teacher-only: forcibly stop a participant's screen share. Lumexa lets
   * every participant share their screen freely, with no permission gate —
   * this is the one-way brake on that: mute whatever SCREEN_SHARE(+AUDIO)
   * track they currently have published. The client also gets a data-
   * channel notice (see ClassroomController → useClassroomControls) so the
   * presenter's own UI/capture stream stops cleanly instead of just going
   * dark for everyone else. */
  async stopParticipantScreenShare(
    userId: string,
    room: string,
    identity: string,
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    const client = this.getRoomServiceClient();
    for (const c of await this.connectionsOf(client, room, identity)) {
      const shareTracks = c.tracks.filter(
        (t) =>
          t.source === TrackSource.SCREEN_SHARE ||
          t.source === TrackSource.SCREEN_SHARE_AUDIO,
      );
      for (const track of shareTracks) {
        await client.mutePublishedTrack(room, c.identity, track.sid, true);
      }
    }
    return { ok: true };
  }

  /** Teacher-only: revoke or restore a participant's ability to publish a
   * microphone track (LiveKit enforces this server-side via the
   * participant's own permission grant — the client SDK can't work around
   * it just by calling setMicrophoneEnabled). Locking also immediately
   * mutes whatever mic track is currently live. */
  async setParticipantMicLocked(
    userId: string,
    room: string,
    identity: string,
    locked: boolean,
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    const client = this.getRoomServiceClient();
    for (const participant of await this.connectionsOf(
      client,
      room,
      identity,
    )) {
      const current = participant.permission;
      const currentSources = current?.canPublishSources?.length
        ? current.canPublishSources
        : [
            TrackSource.CAMERA,
            TrackSource.MICROPHONE,
            TrackSource.SCREEN_SHARE,
            TrackSource.SCREEN_SHARE_AUDIO,
          ];
      const nextSources = locked
        ? currentSources.filter((s) => s !== TrackSource.MICROPHONE)
        : Array.from(new Set([...currentSources, TrackSource.MICROPHONE]));

      await client.updateParticipant(room, participant.identity, undefined, {
        canPublish: current?.canPublish ?? true,
        canSubscribe: current?.canSubscribe ?? true,
        canPublishData: current?.canPublishData ?? true,
        canPublishSources: nextSources,
      });

      if (locked) {
        const micTrack = participant.tracks.find(
          (t) => t.source === TrackSource.MICROPHONE,
        );
        if (micTrack && !micTrack.muted) {
          await client.mutePublishedTrack(
            room,
            participant.identity,
            micTrack.sid,
            true,
          );
        }
      }
    }
    return { ok: true };
  }

  async removeParticipant(
    userId: string,
    room: string,
    identity: string,
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    if (personKey(identity) === userId) {
      throw new BadRequestException(
        'You cannot remove yourself from your own class.',
      );
    }
    const client = this.getRoomServiceClient();

    // Removing a person removes them from every device they are in from.
    const connections = await this.connectionsOf(client, room, identity);
    if (connections.length === 0) return { ok: true }; // already gone

    const displayName =
      connections[0].name.replace(/\s*\((Teacher|Student)\)\s*$/i, '').trim() ||
      connections[0].name ||
      'Student';
    await this.admissionService.markRemoved(
      room,
      personKey(identity),
      displayName,
      'STUDENT',
    );

    for (const c of connections) {
      await client.removeParticipant(room, c.identity);
    }
    return { ok: true };
  }

  /** Merges into the room's JSON metadata — the shared source of truth for
   * classroom-wide state (chat lock, "students can unmute", recording) that
   * every participant's client picks up via LiveKit's RoomMetadataChanged
   * event. */
  private async patchRoomMetadata(
    room: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const client = this.getRoomServiceClient();
    let current: Record<string, unknown> = {};
    try {
      const info = await client.listRooms([room]);
      const meta = info[0]?.metadata;
      if (meta) current = JSON.parse(meta) as Record<string, unknown>;
    } catch {
      current = {};
    }
    const next = { ...current, ...patch };
    await client.updateRoomMetadata(room, JSON.stringify(next));
    return next;
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
      await this.deleteLiveKitRoom(room);
    } else {
      await this.recordingService.stopActiveSegmentIfAny(room);
      await this.deleteLiveKitRoom(room);
      // The demo room has a fixed name, so unlike a real class it would stay
      // locked for the next QA session.
      await this.roomAccess.setLocked(room, false, userId).catch(() => {});
    }

    return { ok: true, status, ...(lessons ? { lessons } : {}) };
  }

  private async deleteLiveKitRoom(room: string): Promise<void> {
    await this.getRoomServiceClient()
      .deleteRoom(room)
      .catch(() => {
        // Room may already be empty/gone — ending the class record still
        // succeeded above, which is what matters.
      });
  }

  /** Merges into the room's JSON metadata — the shared source of truth for
   * classroom-wide state (chat lock, "students can unmute") that every
   * participant's client picks up via LiveKit's RoomMetadataChanged event.
   * Only these two settings can be changed this way: the recording flag and the
   * room lock have their own endpoints and are owned by the server. */
  async updateClassroomState(
    userId: string,
    room: string,
    patch: { chatLocked?: boolean; studentsMuted?: boolean },
  ): Promise<{ ok: true; state: Record<string, unknown> }> {
    await this.assertTeacherOfRoom(userId, room);
    const allowed: Record<string, boolean> = {};
    if (typeof patch?.chatLocked === 'boolean') {
      allowed.chatLocked = patch.chatLocked;
    }
    if (typeof patch?.studentsMuted === 'boolean') {
      allowed.studentsMuted = patch.studentsMuted;
    }
    const next = await this.patchRoomMetadata(room, allowed);
    return { ok: true, state: next };
  }

  /** Teacher-only: lock or unlock the classroom. While it is locked no student
   * can join (see RoomAccessService); people already inside stay. The database
   * decides; the room's metadata only mirrors it so every screen updates at
   * once (the LiveKit room may not exist yet, which is fine). */
  async setRoomLocked(
    userId: string,
    room: string,
    locked: boolean,
  ): Promise<{ ok: true; locked: boolean }> {
    await this.assertTeacherOfRoom(userId, room);
    const result = await this.roomAccess.setLocked(room, locked, userId);
    await this.patchRoomMetadata(room, { roomLocked: result.locked }).catch(
      (err) =>
        this.logger.debug(
          `Room ${room} is not live yet, lock state not mirrored: ${err}`,
        ),
    );
    return { ok: true, locked: result.locked };
  }
}
