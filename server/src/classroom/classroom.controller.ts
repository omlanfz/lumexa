import {
  Controller,
  Post,
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

@Controller('classroom')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

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
    @Body() body: { outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED' },
  ) {
    return this.classroomService.endClass(req.user.userId, room, body?.outcome);
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
