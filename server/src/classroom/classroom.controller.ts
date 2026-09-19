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
import { StripeService } from '../payments/stripe.service';

@Controller('classroom')
export class ClassroomController {
  constructor(
    private readonly classroomService: ClassroomService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('join')
  @UseGuards(AuthGuard('jwt'))
  joinLab(
    @Request() req,
    @Body() body: { bookingId?: string; scheduledLessonId?: string },
  ) {
    return this.classroomService.joinLab(req.user.userId, body);
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
  endClass(@Request() req, @Param('room') room: string) {
    return this.classroomService.endClass(req.user.userId, room);
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
    return this.classroomService.handleLiveKitWebhook(
      body,
      authHeader,
      this.stripeService,
    );
  }
}
