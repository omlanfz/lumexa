import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  constructor(private prisma: PrismaService) {}

  async joinLab(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
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
    } else if (booking.student.parentId === userId) {
      participantName = booking.student.name + ' (Student)';
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
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
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
        }
      }
    } catch (err) {
      this.logger.error(`Webhook processing error: ${err}`);
      // Don't throw — webhook endpoints should always return 200
    }
  }
}
