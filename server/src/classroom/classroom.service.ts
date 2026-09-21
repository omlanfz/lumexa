import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StudentsService } from '../students/students.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { PayoutsService } from '../payouts/payouts.service';
import { AlertsService } from '../alerts/alerts.service';
import { StripeService } from '../payments/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getClassWindow,
  computeLateMinutes,
} from '../scheduling/lesson-window.util';
import { LATE_JOIN_GRACE_MINUTES } from '../payouts/payout.constants';
import {
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
import { RecordingService } from './recording.service';
import { AdmissionService } from './admission.service';
import {
  DEMO_ROOM_NAME,
  isLessonRoom,
  lessonIdFromRoom,
} from './room-ref.util';

type EndClassOutcome = 'COMPLETED' | 'PARTIALLY_COMPLETED';

export interface EndClassParams {
  outcome?: EndClassOutcome;
  reason?: ClassEndReason;
  note?: string;
}

// ─── Temporary QA demo classroom ────────────────────────────────────────────
//
// Lets exactly two seeded accounts (Teacher Demo / Demo Student) jump into a
// shared classroom instantly, with no real booking or scheduled lesson
// involved, purely to test/QA the classroom experience. Deliberately kept
// isolated from Booking/ScheduledLesson/payouts/cron so it can never affect
// real revenue, payout, or admin reporting — remove this block (and the
// join-demo controller route + frontend buttons) once QA is done.
const DEMO_TEACHER_EMAIL = 'dmtc@gmail.com';
const DEMO_STUDENT_EMAIL = 'dmst@gmail.com';

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
    private studentLedgerService: StudentLedgerService,
    private schedulingService: SchedulingService,
    private payoutsService: PayoutsService,
    private alertsService: AlertsService,
    private stripeService: StripeService,
    private recordingService: RecordingService,
    private admissionService: AdmissionService,
    private notifications: NotificationsService,
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
      identity: userId,
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
    kind: 'BOOKING' | 'LESSON',
    id: string,
  ): Promise<{ token: string; url: string | undefined; roomName: string }> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret)
      throw new BadRequestException('Video service is not configured.');

    let room: string;
    if (kind === 'LESSON') {
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
      room = `lesson-${id}`;
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
    kind: 'BOOKING' | 'LESSON',
    id: string,
  ): Promise<{ ok: true }> {
    return this.recordingService.retryMerge(
      kind === 'LESSON' ? 'lesson' : 'booking',
      id,
    );
  }

  /** Dispatches to the marketplace-booking flow or the curriculum
   * scheduled-lesson flow depending on which id was given. */
  async joinLab(
    userId: string,
    dto: { bookingId?: string; scheduledLessonId?: string },
  ) {
    if (dto.scheduledLessonId) {
      return this.joinScheduledLesson(userId, dto.scheduledLessonId);
    }
    if (dto.bookingId) {
      return this.joinBooking(userId, dto.bookingId);
    }
    throw new BadRequestException(
      'Either bookingId or scheduledLessonId is required.',
    );
  }

  // ─── Curriculum flow: Operations-scheduled recurring lessons ─────────────

  async joinScheduledLesson(userId: string, lessonId: string) {
    const lesson = await this.schedulingService.getLessonForClassroom(lessonId);

    // A class is never closed by its own scheduled end time — only the
    // teacher manually ending it (see endClass) changes its status away
    // from UPCOMING. So the only time-based gate left is "hasn't opened
    // yet"; once open, the room stays joinable for as long as the lesson
    // is still UPCOMING, however long past its scheduled end that is.
    if (lesson.status !== LessonStatus.UPCOMING) {
      throw new BadRequestException('This class has already ended.');
    }
    const window = getClassWindow(lesson.start, lesson.end);
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

    if (lesson.teacher.userId === userId) {
      participantName = `${lesson.teacher.user.fullName} (Teacher)`;
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

    const roomName = `lesson-${lessonId}`;

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
      identity: userId,
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

    await this.schedulingService
      .recordLessonJoin(lessonId, role)
      .catch((err) => {
        this.logger.error(
          `Failed to record join for lesson ${lessonId}: ${err}`,
        );
      });

    // Immediate late-join check — a teacher who joins more than the grace
    // period after the scheduled start is penalized right away rather than
    // waiting for PayoutsService's sweep cron. Idempotent either way.
    if (role === 'TEACHER') {
      const lateMinutes = computeLateMinutes(lesson.start, new Date());
      if (lateMinutes > LATE_JOIN_GRACE_MINUTES) {
        await this.payoutsService
          .triggerLateJoinPenalty({
            teacherId: lesson.teacher.id,
            scheduledLessonId: lessonId,
            lateMinutes,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to apply late-join penalty for lesson ${lessonId}: ${err}`,
            );
          });
      }
    }

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName,
      scheduledStart: lesson.start.toISOString(),
      classType: lesson.classType,
    };
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
      identity: userId,
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

      if (event.event === 'egress_ended') {
        const room = event.egressInfo?.roomName;
        if (!room) return;

        await this.recordingService.handleEgressEnded(event.egressInfo as any);

        if (isLessonRoom(room)) return; // no payment/gem flow for curriculum lessons
        await this.finalizeBookingIfDue(room);
      }
    } catch (err) {
      this.logger.error(`Webhook processing error: ${err}`);
      // Don't throw — webhook endpoints should always return 200
    }
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

  /** Room names are either `lesson-<scheduledLessonId>` (curriculum flow) or
   * a raw bookingId (marketplace flow) — mirrors the naming in joinLab. */
  private async getRoomTeacherUserId(roomName: string): Promise<string> {
    if (roomName === DEMO_ROOM_NAME) {
      const teacher = await this.prisma.user.findUnique({
        where: { email: DEMO_TEACHER_EMAIL },
        select: { id: true },
      });
      if (!teacher) throw new BadRequestException('Classroom not found.');
      return teacher.id;
    }
    if (roomName.startsWith('lesson-')) {
      const lessonId = roomName.slice('lesson-'.length);
      const lesson =
        await this.schedulingService.getLessonForClassroom(lessonId);
      return lesson.teacher.userId;
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: roomName },
      include: { shift: { include: { teacher: true } } },
    });
    if (!booking) throw new BadRequestException('Classroom not found.');
    return booking.shift.teacher.userId;
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

  /** Used by the heartbeat endpoint — trusts the room's own teacher
   * assignment rather than whatever role the client claims to be. */
  async resolveParticipantRole(
    userId: string,
    roomName: string,
  ): Promise<'TEACHER' | 'STUDENT'> {
    const teacherUserId = await this.getRoomTeacherUserId(roomName);
    return teacherUserId === userId ? 'TEACHER' : 'STUDENT';
  }

  private async findPublishedTrackSid(
    client: RoomServiceClient,
    room: string,
    identity: string,
    source: TrackSource,
  ): Promise<string | null> {
    const participant = await client.getParticipant(room, identity);
    const track = participant.tracks.find((t) => t.source === source);
    return track?.sid ?? null;
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
    const sid = await this.findPublishedTrackSid(
      client,
      room,
      identity,
      source,
    );
    if (sid) {
      await client.mutePublishedTrack(room, identity, sid, true);
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
      if (p.identity === userId) continue; // never mute the teacher
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
    const participant = await client.getParticipant(room, identity);
    const shareTracks = participant.tracks.filter(
      (t) =>
        t.source === TrackSource.SCREEN_SHARE ||
        t.source === TrackSource.SCREEN_SHARE_AUDIO,
    );
    for (const track of shareTracks) {
      await client.mutePublishedTrack(room, identity, track.sid, true);
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
    const participant = await client.getParticipant(room, identity);
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

    await client.updateParticipant(room, identity, undefined, {
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
        await client.mutePublishedTrack(room, identity, micTrack.sid, true);
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
    const client = this.getRoomServiceClient();

    const displayName = await client
      .getParticipant(room, identity)
      .then(
        (p) =>
          p.name.replace(/\s*\((Teacher|Student)\)\s*$/i, '').trim() || p.name,
      )
      .catch(() => 'Student');
    await this.admissionService.markRemoved(
      room,
      identity,
      displayName,
      'STUDENT',
    );

    await client.removeParticipant(room, identity);
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
   * Teacher manually ends the class — the ONLY way a curriculum
   * (ScheduledLesson) class ever leaves UPCOMING under a teacher's own
   * action (see autoEndClassForServerReason for the server-initiated
   * teacher-disconnect path). For the curriculum flow the teacher must
   * choose an outcome:
   *   - COMPLETED: requires the student to have actually joined (see
   *     studentJoinedAt) — otherwise rejected — then awards the teacher's
   *     +BDT 200 completed-class earning exactly once and deducts exactly
   *     one lesson from the student's balance.
   *   - PARTIALLY_COMPLETED ("Incomplete" in the UI): requires a reason;
   *     shifts the remaining schedule so the student gets a make-up
   *     occurrence for the SAME lesson number (see SchedulingService.
   *     handlePartialCompletion) — lesson progression only ever happens on
   *     COMPLETED. No earning, no deduction.
   * Any in-progress recording is stopped first either way, then handed to
   * RecordingService to merge asynchronously (see finalizeAtClassEnd).
   * The legacy Booking (marketplace) flow has no outcome/earning workflow —
   * it just closes the room, recording an end reason if one was given.
   */
  async endClass(
    userId: string,
    room: string,
    params: EndClassParams = {},
  ): Promise<{ ok: true }> {
    const { outcome, reason, note } = params;
    await this.assertTeacherOfRoom(userId, room);

    if (outcome === 'PARTIALLY_COMPLETED') {
      if (!reason) {
        throw new BadRequestException(
          'Choose a reason for marking this class incomplete.',
        );
      }
      if (reason === ClassEndReason.OTHER && !note?.trim()) {
        throw new BadRequestException('Add a short note explaining why.');
      }
    }

    if (isLessonRoom(room)) {
      const lessonId = lessonIdFromRoom(room);
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id: lessonId },
      });
      if (!lesson) throw new BadRequestException('Classroom not found.');
      if (lesson.status !== LessonStatus.UPCOMING) {
        throw new BadRequestException('This class has already been ended.');
      }
      if (!outcome) {
        throw new BadRequestException(
          'Choose Completed or Incomplete to end this class.',
        );
      }
      this.assertEndClassWindowOpen(lesson.start);

      await this.recordingService.stopActiveSegmentIfAny(room);
      await this.recordingService.finalizeAtClassEnd(room);

      if (outcome === 'COMPLETED') {
        if (!lesson.studentJoinedAt) {
          throw new BadRequestException(
            'This class cannot be marked as completed because the student did not join.',
          );
        }
        // Deduct-one-lesson and award-teacher-earning happen together, each
        // idempotent and independently retry-safe (see PayoutsService/
        // StudentLedgerService's unique-constraint guards) — but the status
        // flip itself is the one write that must never be split from them,
        // so a crash between "marked COMPLETED" and "earning recorded"
        // can't leave the class completed with no payout. The two triggers
        // below are safety-netted by their own cron sweeps either way.
        await this.prisma.scheduledLesson.update({
          where: { id: lessonId },
          data: {
            status: LessonStatus.COMPLETED,
            endedAt: new Date(),
            endedByRole: 'TEACHER',
          },
        });
        await this.payoutsService
          .triggerScheduledLessonCompleted(lessonId)
          .catch((err) => {
            this.logger.error(
              `Failed to record completed-class earning for lesson ${lessonId}: ${err}`,
            );
          });
        await this.studentLedgerService
          .triggerScheduledLessonCompleted(lessonId)
          .catch((err) => {
            this.logger.error(
              `Failed to record student lesson-completed deduction for lesson ${lessonId}: ${err}`,
            );
          });
      } else {
        await this.prisma.scheduledLesson.update({
          where: { id: lessonId },
          data: {
            endedAt: new Date(),
            endedByRole: 'TEACHER',
            endReason: reason,
            endNote: note?.trim() || null,
          },
        });
        // Keeps the SAME lessonNumber for the next occurrence, shifting only
        // that redo + later occurrences — it never touches lesson content
        // for occurrences the student hasn't reached yet.
        await this.schedulingService.handlePartialCompletion(lessonId, userId);

        // A genuine no-show: the teacher ended the class and the student
        // never joined at all (vs. a partial-completion that ran long with
        // both sides present — that case has studentJoinedAt set).
        if (!lesson.studentJoinedAt) {
          const [student, teacherProfile] = await Promise.all([
            this.prisma.user.findUnique({
              where: { id: lesson.studentUserId },
              select: { email: true, fullName: true },
            }),
            this.prisma.teacherProfile.findUnique({
              where: { id: lesson.teacherId },
              select: { user: { select: { fullName: true } } },
            }),
          ]);
          if (student && teacherProfile) {
            this.notifications
              .sendMissedClassNotice(student.email, {
                lessonId,
                studentName: student.fullName,
                teacherName: teacherProfile.user.fullName,
                classStart: lesson.start,
              })
              .catch(() => {});
          }
        }
      }
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
    } else {
      await this.recordingService.stopActiveSegmentIfAny(room);
    }

    const client = this.getRoomServiceClient();
    await client.deleteRoom(room).catch(() => {
      // Room may already be empty/gone — ending the class record still
      // succeeded above, which is what matters.
    });
    return { ok: true };
  }

  /** Server-initiated equivalent of endClass's "Incomplete" path, used only
   * by PresenceService when a teacher hasn't sent a heartbeat in 20+
   * minutes. No auth check (there's no acting user) and no 10-minute
   * window gate (a human didn't fat-finger this). Returns false if the
   * room already isn't live — nothing to do, so the caller doesn't log a
   * spurious "auto-ended" line. */
  async autoEndClassForServerReason(
    room: string,
    reason: ClassEndReason,
  ): Promise<boolean> {
    await this.recordingService.stopActiveSegmentIfAny(room);

    if (isLessonRoom(room)) {
      const lessonId = lessonIdFromRoom(room);
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id: lessonId },
        include: { teacher: true },
      });
      if (!lesson || lesson.status !== LessonStatus.UPCOMING) return false;

      await this.recordingService.finalizeAtClassEnd(room);
      await this.prisma.scheduledLesson.update({
        where: { id: lessonId },
        data: { endedAt: new Date(), endedByRole: 'SYSTEM', endReason: reason },
      });
      await this.schedulingService
        .handlePartialCompletion(lessonId, lesson.teacher.userId)
        .catch((err) =>
          this.logger.error(`Could not auto-end lesson ${lessonId}: ${err}`),
        );

      const client = this.getRoomServiceClient();
      await client.deleteRoom(room).catch(() => {});
      return true;
    }

    if (room === DEMO_ROOM_NAME) return false;

    const booking = await this.prisma.booking.findUnique({
      where: { id: room },
    });
    if (!booking) return false;
    await this.recordingService.finalizeAtClassEnd(room);
    await this.prisma.booking.update({
      where: { id: room },
      data: { endReason: reason },
    });
    const client = this.getRoomServiceClient();
    await client.deleteRoom(room).catch(() => {});
    return true;
  }

  /** Merges into the room's JSON metadata — the shared source of truth for
   * classroom-wide state (chat lock, "students can unmute") that every
   * participant's client picks up via LiveKit's RoomMetadataChanged event. */
  async updateClassroomState(
    userId: string,
    room: string,
    patch: { chatLocked?: boolean; studentsMuted?: boolean },
  ): Promise<{ ok: true; state: Record<string, unknown> }> {
    await this.assertTeacherOfRoom(userId, room);
    const next = await this.patchRoomMetadata(room, patch);
    return { ok: true, state: next };
  }
}
