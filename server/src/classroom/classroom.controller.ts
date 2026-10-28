import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ClassroomService } from './classroom.service';
import { AdmissionService } from './admission.service';
import type { ClassOutcome } from './class-finalization.service';
import { ClassEndReason } from '@prisma/client';

@Controller('classroom')
export class ClassroomController {
  constructor(
    private readonly classroomService: ClassroomService,
    private readonly admissionService: AdmissionService,
  ) {}

  // Asked twice per person (when the page opens, and again when they press Join,
  // so the teacher's lock and the 10-people limit are checked at the last moment),
  // and a school's whole class may share one IP address — so well above the
  // default of 20 a minute.
  @Post('join')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  joinLab(
    @Request() req,
    @Body()
    body: {
      bookingId?: string;
      scheduledLessonId?: string;
      batchSessionId?: string;
    },
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

  // Muting people, stopping a screen share and locking a microphone have no
  // routes: the teacher's browser does those through Daily directly (see the
  // "Teacher-only in-room controls" note in classroom.service.ts).

  /** Removes a person (by user id) from every device they are in from; they
   * must knock to come back in. */
  @Post(':room/remove-participant')
  @UseGuards(AuthGuard('jwt'))
  removeParticipant(
    @Request() req,
    @Param('room') room: string,
    @Body() body: { userId: string },
  ) {
    if (typeof body?.userId !== 'string' || !body.userId) {
      throw new BadRequestException('"userId" is required.');
    }
    return this.classroomService.removeParticipant(
      req.user.userId,
      room,
      body.userId,
    );
  }

  @Post(':room/end')
  @UseGuards(AuthGuard('jwt'))
  endClass(
    @Request() req,
    @Param('room') room: string,
    @Body()
    body: {
      outcome?: ClassOutcome;
      reason?: ClassEndReason;
      note?: string;
    },
  ) {
    return this.classroomService.endClass(req.user.userId, room, body ?? {});
  }

  // Recording has its own controller: see RecordingController.

  /** Lock or unlock the classroom. While locked no student can join; people
   * already inside stay. A class starts unlocked. */
  @Post(':room/lock')
  @UseGuards(AuthGuard('jwt'))
  setRoomLocked(
    @Request() req: { user: { userId: string } },
    @Param('room') room: string,
    @Body() body: { locked: boolean },
  ) {
    if (typeof body?.locked !== 'boolean') {
      throw new BadRequestException('"locked" must be true or false.');
    }
    return this.classroomService.setRoomLocked(
      req.user.userId,
      room,
      body.locked,
    );
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
}
