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
import { NotificationsService } from '../notifications/notifications.service';
import {
  getClassWindow,
  computeLateMinutes,
} from '../scheduling/lesson-window.util';
import { LATE_JOIN_GRACE_MINUTES } from '../payouts/payout.constants';
import { LessonStatus, RecordingStatus, SpaceRank } from '@prisma/client';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk';

type EndClassOutcome = 'COMPLETED' | 'PARTIALLY_COMPLETED';

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
const DEMO_ROOM_NAME = 'lumexa-demo-classroom';

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

  // In-memory recording state for the demo classroom only — there is no
  // Booking/ScheduledLesson row backing DEMO_ROOM_NAME, so this can't live in
  // the database. Fine for QA use by two accounts; resets on server restart.
  private demoRecordingState: {
    egressId: string | null;
    recordingStatus: RecordingStatus;
  } = { egressId: null, recordingStatus: RecordingStatus.NONE };

  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
    private schedulingService: SchedulingService,
    private payoutsService: PayoutsService,
    private alertsService: AlertsService,
    private stripeService: StripeService,
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
    const participantName = `${user?.fullName ?? (isTeacher ? 'Teacher Demo' : 'Demo Student')} (${isTeacher ? 'Teacher' : 'Student'})`;

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
    };
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

    if (booking.shift.teacher.userId === userId) {
      participantName = booking.shift.teacher.user.fullName + ' (Teacher)';
    } else if (booking.student?.parentId === userId) {
      participantName = booking.student.name + ' (Student)';
    } else if (booking.studentUser?.id === userId) {
      participantName = booking.studentUser.fullName + ' (Student)';
    } else {
      throw new BadRequestException(
        'Access denied: you are not assigned to this classroom.',
      );
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
    };
  }

  // ─── Recording (teacher-triggered only, self-hosted LiveKit Egress) ──────
  //
  // Room name convention (see joinScheduledLesson/joinBooking above):
  //   "lesson-<scheduledLessonId>" → curriculum flow, recording fields live
  //   on ScheduledLesson; any other room name is a raw Booking id, fields
  //   live on Booking. Both flows share the exact same pipeline: LiveKit
  //   Egress → S3-compatible storage (self-hosted MinIO in production, via
  //   S3_ENDPOINT/forcePathStyle below) → the Egress webhook confirms the
  //   upload and only then is the recording ever marked AVAILABLE.

  private isLessonRoom(room: string): boolean {
    return room.startsWith('lesson-');
  }

  private lessonIdFromRoom(room: string): string {
    return room.slice('lesson-'.length);
  }

  private egressConfigured(): boolean {
    return !!(
      process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      (process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY) &&
      (process.env.S3_SECRET_KEY || process.env.AWS_SECRET_KEY) &&
      (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET)
    );
  }

  /** LiveKit Egress S3Upload config — points at self-hosted MinIO whenever
   * S3_ENDPOINT is set (MinIO requires path-style addressing), falling back
   * to plain AWS S3 env vars for compatibility with the previous setup. */
  private buildEgressS3Config() {
    const endpoint = process.env.S3_ENDPOINT || undefined;
    return {
      accessKey: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY,
      secret: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_KEY,
      bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    };
  }

  private async getEntityRecordingState(room: string): Promise<{
    egressId: string | null;
    recordingStatus: RecordingStatus;
  } | null> {
    if (room === DEMO_ROOM_NAME) return this.demoRecordingState;
    if (this.isLessonRoom(room)) {
      return this.prisma.scheduledLesson.findUnique({
        where: { id: this.lessonIdFromRoom(room) },
        select: { egressId: true, recordingStatus: true },
      });
    }
    return this.prisma.booking.findUnique({
      where: { id: room },
      select: { egressId: true, recordingStatus: true },
    });
  }

  private async updateEntityRecording(
    room: string,
    data: {
      egressId?: string | null;
      recordingStatus?: RecordingStatus;
      recordingUrl?: string | null;
      recordingStartedAt?: Date | null;
    },
  ): Promise<void> {
    if (room === DEMO_ROOM_NAME) {
      this.demoRecordingState = {
        egressId:
          data.egressId !== undefined
            ? data.egressId
            : this.demoRecordingState.egressId,
        recordingStatus:
          data.recordingStatus ?? this.demoRecordingState.recordingStatus,
      };
      return;
    }
    if (this.isLessonRoom(room)) {
      await this.prisma.scheduledLesson.update({
        where: { id: this.lessonIdFromRoom(room) },
        data,
      });
    } else {
      await this.prisma.booking.update({ where: { id: room }, data });
    }
  }

  /** Teacher clicks Record. Never called automatically — see joinBooking/
   * joinScheduledLesson, which no longer start recording on their own. */
  async startTeacherRecording(
    userId: string,
    room: string,
  ): Promise<{ ok: true; recordingStatus: RecordingStatus }> {
    await this.assertTeacherOfRoom(userId, room);

    if (!this.egressConfigured()) {
      throw new BadRequestException(
        'Recording is not configured for this environment yet.',
      );
    }

    const current = await this.getEntityRecordingState(room);
    if (current?.recordingStatus === RecordingStatus.RECORDING) {
      return { ok: true, recordingStatus: RecordingStatus.RECORDING };
    }

    const { EgressClient } = await import('livekit-server-sdk');
    const egress = new EgressClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
    );

    try {
      const info = await egress.startRoomCompositeEgress(room, {
        file: {
          fileType: 3, // MP4
          filepath: `recordings/${room}-${Date.now()}.mp4`,
          s3: this.buildEgressS3Config(),
        },
      } as any);

      await this.updateEntityRecording(room, {
        egressId: info.egressId,
        recordingStatus: RecordingStatus.RECORDING,
        recordingStartedAt: new Date(),
      });
      await this.patchRoomMetadata(room, { recording: true });

      this.logger.log(`Recording started for room ${room}`);
      return { ok: true, recordingStatus: RecordingStatus.RECORDING };
    } catch (err) {
      this.logger.error(`Egress start error for ${room}: ${err}`);
      throw new BadRequestException(
        'Could not start recording. Please try again.',
      );
    }
  }

  /** Teacher clicks Stop Recording (or endClass stops it automatically when
   * the room closes). Never marks the recording AVAILABLE here — only the
   * Egress webhook does that, once the upload is actually confirmed. */
  private async stopTeacherRecordingIfActive(room: string): Promise<void> {
    const current = await this.getEntityRecordingState(room);
    if (
      !current?.egressId ||
      current.recordingStatus !== RecordingStatus.RECORDING
    ) {
      return;
    }
    try {
      const { EgressClient } = await import('livekit-server-sdk');
      const egress = new EgressClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
      );
      await egress.stopEgress(current.egressId);
    } catch (err) {
      this.logger.error(`Egress stop error for ${room}: ${err}`);
    }
    await this.updateEntityRecording(room, {
      recordingStatus: RecordingStatus.PROCESSING,
    });
    await this.patchRoomMetadata(room, { recording: false }).catch(() => {});
  }

  async stopTeacherRecording(
    userId: string,
    room: string,
  ): Promise<{ ok: true; recordingStatus: RecordingStatus }> {
    await this.assertTeacherOfRoom(userId, room);
    const current = await this.getEntityRecordingState(room);
    if (current?.recordingStatus !== RecordingStatus.RECORDING) {
      throw new BadRequestException('There is no active recording to stop.');
    }
    await this.stopTeacherRecordingIfActive(room);
    return { ok: true, recordingStatus: RecordingStatus.PROCESSING };
  }

  private async notifyTeacherOfRecordingFailure(room: string): Promise<void> {
    const teacherUserId = await this.getRoomTeacherUserId(room).catch(
      () => null,
    );
    if (!teacherUserId) return;
    await this.alertsService.create({
      userId: teacherUserId,
      role: 'TEACHER',
      type: 'RECORDING_FAILED',
      title: 'Recording failed',
      message:
        "This class's recording could not be saved. Please contact support if you need a replacement.",
      metadata: { room },
    });
  }

  /**
   * Handle LiveKit webhook events. `egress_ended` is the ONLY point a
   * recording is ever marked AVAILABLE — and only when the Egress status
   * confirms the file actually finished uploading. Anything else (aborted,
   * failed, or a missing file location) is marked FAILED so it's never
   * silently mistaken for a successful recording.
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

        const egressInfo = event.egressInfo as any;
        const fileLocation: string | undefined = egressInfo?.file?.location;
        // EgressStatus.EGRESS_COMPLETE === 3 in livekit-server-sdk's proto enum.
        const succeeded =
          egressInfo?.status === 3 || egressInfo?.status === 'EGRESS_COMPLETE';

        if (succeeded && fileLocation) {
          await this.updateEntityRecording(room, {
            recordingUrl: fileLocation,
            recordingStatus: RecordingStatus.AVAILABLE,
          });
          this.logger.log(`Recording available for room ${room}`);
        } else {
          await this.updateEntityRecording(room, {
            recordingStatus: RecordingStatus.FAILED,
          });
          this.logger.warn(
            `Recording failed for room ${room} (egress status: ${egressInfo?.status})`,
          );
          await this.notifyTeacherOfRecordingFailure(room).catch(() => {});
        }

        if (this.isLessonRoom(room)) return; // no payment/gem flow for curriculum lessons
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

  async removeParticipant(
    userId: string,
    room: string,
    identity: string,
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    const client = this.getRoomServiceClient();
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

  /**
   * Teacher manually ends the class — the ONLY way a curriculum
   * (ScheduledLesson) class ever leaves UPCOMING; there is no automatic
   * time-based ending. For the curriculum flow the teacher must choose an
   * outcome:
   *   - COMPLETED: requires the student to have actually joined (see
   *     studentJoinedAt) — otherwise rejected — then awards the teacher's
   *     +BDT 200 completed-class earning exactly once.
   *   - PARTIALLY_COMPLETED: shifts the remaining schedule so the student
   *     gets a make-up occurrence for the same lesson (see
   *     SchedulingService.handlePartialCompletion). No earning is awarded.
   * Any in-progress recording is stopped first either way (its upload still
   * finalizes asynchronously — see stopTeacherRecordingIfActive/webhook).
   * The legacy Booking (marketplace) flow has no such outcome/earning
   * workflow — it just closes the room as before.
   */
  async endClass(
    userId: string,
    room: string,
    outcome?: EndClassOutcome,
  ): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);

    await this.stopTeacherRecordingIfActive(room);

    if (this.isLessonRoom(room)) {
      const lessonId = this.lessonIdFromRoom(room);
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id: lessonId },
      });
      if (!lesson) throw new BadRequestException('Classroom not found.');
      if (lesson.status !== LessonStatus.UPCOMING) {
        throw new BadRequestException('This class has already been ended.');
      }
      if (!outcome) {
        throw new BadRequestException(
          'Choose Completed or Partially Completed to end this class.',
        );
      }

      if (outcome === 'COMPLETED') {
        if (!lesson.studentJoinedAt) {
          throw new BadRequestException(
            'This class cannot be marked as completed because the student did not join.',
          );
        }
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
      } else {
        await this.prisma.scheduledLesson.update({
          where: { id: lessonId },
          data: { endedAt: new Date(), endedByRole: 'TEACHER' },
        });
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
    }

    const client = this.getRoomServiceClient();
    await client.deleteRoom(room).catch(() => {
      // Room may already be empty/gone — ending the class record still
      // succeeded above, which is what matters.
    });
    return { ok: true };
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
