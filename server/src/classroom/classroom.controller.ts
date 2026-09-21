import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassroomService } from './classroom.service';
import { PresenceService } from './presence.service';
import { AdmissionService } from './admission.service';
import { ClassEndReason } from '@prisma/client';

@Controller('classroom')
export class ClassroomController {
  constructor(
    private readonly classroomService: ClassroomService,
    private readonly presenceService: PresenceService,
    private readonly admissionService: AdmissionService,
  ) {}

  @Post('join')
  @UseGuards(AuthGuard('jwt'))
  joinLab(
    @Request() req,
    @Body() body: { bookingId?: string; scheduledLessonId?: string },
  ) {
    return this.classroomService.joinLab(req.user.userId, body);
  }

  /** Temporary QA-only route — see the DEMO_ROOM_NAME block comment in
   * classroom.service.ts. Restricted server-side to the two seeded demo
   * accounts regardless of what the client sends. */
  @Post('join-demo')
  @UseGuards(AuthGuard('jwt'))
  joinDemo(@Request() req) {
    return this.classroomService.joinDemoClassroom(
      req.user.userId,
      req.user.email,
    );
  }

  // ─── Presence heartbeat (server-side teacher-disconnect protection) ──────

  @Post(':room/heartbeat')
  @UseGuards(AuthGuard('jwt'))
  async heartbeat(@Request() req, @Param('room') room: string) {
    const role = await this.classroomService.resolveParticipantRole(
      req.user.userId,
      room,
    );
    await this.presenceService.touch(room, req.user.userId, role);
    return { ok: true };
  }

  // ─── Remove → rejoin admission flow ───────────────────────────────────────

  @Get(':room/admissions')
  @UseGuards(AuthGuard('jwt'))
  async listAdmissions(@Request() req, @Param('room') room: string) {
    await this.classroomService.assertTeacherOfRoomPublic(
      req.user.userId,
      room,
    );
    return this.admissionService.listPending(room);
  }

  @Post(':room/admissions/:admissionId/decide')
  @UseGuards(AuthGuard('jwt'))
  async decideAdmission(
    @Request() req,
    @Param('room') room: string,
    @Param('admissionId') admissionId: string,
    @Body() body: { decision: 'APPROVE' | 'DENY' },
  ) {
    await this.classroomService.assertTeacherOfRoomPublic(
      req.user.userId,
      room,
    );
    return this.admissionService.decide(
      req.user.userId,
      room,
      admissionId,
      body.decision,
    );
  }

  /** Student polls this while waiting to be re-admitted. */
  @Get('admissions/:admissionId/status')
  @UseGuards(AuthGuard('jwt'))
  admissionStatus(@Request() req, @Param('admissionId') admissionId: string) {
    return this.admissionService.getStatus(admissionId, req.user.userId);
  }

  // ─── Teacher-only in-room management ───────────────────────────────────────

  @Post(':room/mute-participant')
  @UseGuards(AuthGuard('jwt'))
  muteParticipant(
    @Request() req,
    @Param('room') room: string,
    @Body() body: { identity: string; kind: 'audio' | 'video' },
  ) {
    return this.classroomService.muteParticipant(
      req.user.userId,
      room,
      body.identity,
      body.kind,
    );
  }

  @Post(':room/mute-all')
  @UseGuards(AuthGuard('jwt'))
  muteAll(@Request() req, @Param('room') room: string) {
    return this.classroomService.muteAllParticipants(req.user.userId, room);
  }

  /** Teacher-only: forcibly stop a participant's screen share. Everyone can
   * start sharing without permission — this is the teacher's brake on it. */
  @Post(':room/stop-screen-share')
  @UseGuards(AuthGuard('jwt'))
  stopParticipantScreenShare(
    @Request() req,
    @Param('room') room: string,
    @Body() body: { identity: string },
  ) {
    return this.classroomService.stopParticipantScreenShare(
      req.user.userId,
      room,
      body.identity,
    );
  }

  /** Allow/unallow a participant to unmute — revokes their LiveKit
   * publish permission for the microphone source server-side, not just a
   * client-side toggle. */
  @Post(':room/participant-mic-lock')
  @UseGuards(AuthGuard('jwt'))
  setParticipantMicLocked(
    @Request() req,
    @Param('room') room: string,
    @Body() body: { identity: string; locked: boolean },
  ) {
    return this.classroomService.setParticipantMicLocked(
      req.user.userId,
      room,
      body.identity,
      body.locked,
    );
  }

  @Post(':room/remove-participant')
  @UseGuards(AuthGuard('jwt'))
  removeParticipant(
    @Request() req,
    @Param('room') room: string,
    @Body() body: { identity: string },
  ) {
    return this.classroomService.removeParticipant(
      req.user.userId,
      room,
      body.identity,
    );
  }

  @Post(':room/end')
  @UseGuards(AuthGuard('jwt'))
  endClass(
    @Request() req,
    @Param('room') room: string,
    @Body()
    body: {
      outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED';
      reason?: ClassEndReason;
      note?: string;
    },
  ) {
    return this.classroomService.endClass(req.user.userId, room, body ?? {});
  }

  @Post(':room/recording/start')
  @UseGuards(AuthGuard('jwt'))
  startRecording(@Request() req, @Param('room') room: string) {
    return this.classroomService.startTeacherRecording(req.user.userId, room);
  }

  @Post(':room/recording/stop')
  @UseGuards(AuthGuard('jwt'))
  stopRecording(@Request() req, @Param('room') room: string) {
    return this.classroomService.stopTeacherRecording(req.user.userId, room);
  }

  @Patch(':room/state')
  @UseGuards(AuthGuard('jwt'))
  updateState(
    @Request() req,
    @Param('room') room: string,
    @Body() body: { chatLocked?: boolean; studentsMuted?: boolean },
  ) {
    return this.classroomService.updateClassroomState(
      req.user.userId,
      room,
      body,
    );
  }

  /**
   * LiveKit webhook — receives events like egress_ended (recording complete).
   * This endpoint is NOT authenticated with JWT — it uses LiveKit's own
   * Authorization header signature verification instead.
   *
   * Must be added to your LiveKit webhook configuration in the LiveKit console.
   */
  @Post('webhook/livekit')
  @HttpCode(HttpStatus.OK) // Always return 200 to LiveKit even on soft errors
  handleLiveKitWebhook(
    @Body() body: any,
    @Headers('Authorization') authHeader: string,
  ) {
    return this.classroomService.handleLiveKitWebhook(body, authHeader);
  }
}
