import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StudentsService } from '../students/students.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { getClassWindow } from '../scheduling/lesson-window.util';
import { SpaceRank } from '@prisma/client';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk';

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
  ) {}

  private computeSpaceRank(sessions: number): SpaceRank {
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (sessions >= RANK_THRESHOLDS[i].min) return RANK_THRESHOLDS[i].rank;
    }
    return 'STARCHILD';
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

    const window = getClassWindow(lesson.start, lesson.end);
    if (!window.joinable) {
      if (window.msUntilStart > 0) {
        const minutesUntilOpen = Math.ceil(
          (window.msUntilStart - 10 * 60 * 1000) / (1000 * 60),
        );
        throw new BadRequestException(
          `Classroom opens 10 minutes before class. Please come back in ${Math.max(minutesUntilOpen, 1)} minute(s).`,
        );
      }
      throw new BadRequestException('This class has already ended.');
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

    // ─── START RECORDING ON FIRST JOIN ──────────────────────────────────────
    // Only start recording if not already recording
    if (!booking.egressId) {
      await this.startRecording(bookingId).catch((err) => {
        // Don't fail the join if recording fails to start — log and continue
        this.logger.error(
          `Failed to start recording for booking ${bookingId}: ${err}`,
        );
      });
    }

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName: bookingId,
    };
  }

  /**
   * Start a LiveKit Egress recording.
   * The recording is uploaded directly to S3 and the URL is stored via webhook.
   *
   * Requires LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
   *          AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, AWS_S3_BUCKET
   */
  private async startRecording(bookingId: string): Promise<void> {
    const requiredVars = [
      'LIVEKIT_URL',
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET',
      'AWS_ACCESS_KEY',
      'AWS_SECRET_KEY',
      'AWS_REGION',
      'AWS_S3_BUCKET',
    ];

    const missing = requiredVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      this.logger.warn(
        `Recording skipped — missing env vars: ${missing.join(', ')}`,
      );
      return;
    }

    // Dynamic import to avoid hard crash if livekit SDK version mismatch
    try {
      const { EgressClient } = await import('livekit-server-sdk');

      const egress = new EgressClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
      );

      const info = await egress.startRoomCompositeEgress(bookingId, {
        file: {
          fileType: 3, // MP4
          filepath: `recordings/${bookingId}.mp4`,
          s3: {
            bucket: process.env.AWS_S3_BUCKET!,
            region: process.env.AWS_REGION!,
            accessKey: process.env.AWS_ACCESS_KEY!,
            secret: process.env.AWS_SECRET_KEY!,
          },
        },
      } as any);

      // Save the egressId so we know recording is in progress
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { egressId: info.egressId },
      });

      this.logger.log(`Recording started for booking ${bookingId}`);
    } catch (err) {
      this.logger.error(`Egress error for ${bookingId}: ${err}`);
      throw err;
    }
  }

  /**
   * Handle LiveKit webhook events.
   * Called when a recording ends — stores the S3 URL and triggers payment capture.
   */
  async handleLiveKitWebhook(
    body: any,
    authHeader: string,
    stripeService: any,
  ): Promise<void> {
    try {
      const { WebhookReceiver } = await import('livekit-server-sdk');
      const receiver = new WebhookReceiver(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );

      const event = await receiver.receive(JSON.stringify(body), authHeader);

      if (event.event === 'egress_ended') {
        const bookingId = event.egressInfo?.roomName;
        const recordingUrl = (event.egressInfo as any)?.file?.location;

        if (!bookingId) return;

        const updateData: any = { recordingUrl: recordingUrl || null };

        await this.prisma.booking.update({
          where: { id: bookingId },
          data: updateData,
        });

        // Capture payment now that class is confirmed complete
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (
          booking?.paymentIntentId &&
          booking.paymentStatus === 'PENDING' &&
          stripeService
        ) {
          await stripeService.capturePayment(booking.paymentIntentId);
          await this.prisma.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: 'CAPTURED' },
          });
          this.logger.log(`Payment captured for booking ${bookingId}`);

          // Award gems and badges for STUDENT-role users
          if (booking.studentUserId) {
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
        }
      }
    } catch (err) {
      this.logger.error(`Webhook processing error: ${err}`);
      // Don't throw — webhook endpoints should always return 200
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

  async endClass(userId: string, room: string): Promise<{ ok: true }> {
    await this.assertTeacherOfRoom(userId, room);
    const client = this.getRoomServiceClient();
    await client.deleteRoom(room);
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
    return { ok: true, state: next };
  }
}
