// FILE PATH: server/src/classroom/recording.controller.ts
//
// The teacher's side of recording a class — see RecordingService for how it
// works. Everything here is scoped to a classroom (LiveKit room name) and is
// refused unless the caller is that room's teacher; the segment must also be
// one that same teacher's browser made.
//
//   POST …/recording/start                    Record pressed
//   POST …/recording/:segmentId/stop          Stop pressed (file now only in the browser)
//   POST …/recording/:segmentId/upload-url    a signed URL to PUT the finished file to
//   POST …/recording/:segmentId/complete      the upload finished: verify it, make it watchable
//   POST …/recording/:segmentId/discard       give the recording up
//   GET  …/recording/segments                 this class's recordings and their state

import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ClassroomService } from './classroom.service';
import { RecordingService } from './recording.service';
import {
  CompleteRecordingUploadDto,
  RecordingUploadUrlDto,
  StartRecordingDto,
  StopRecordingDto,
} from './dto/recording.dto';

/** What the JWT guard puts on the request (see JwtStrategy.validate). */
interface AuthedRequest {
  user: { userId: string; role: string };
}

// A signed URL or a segment's state is private to the teacher: never cached.
const NO_STORE = 'no-store';

@Controller('classroom/:room/recording')
@UseGuards(AuthGuard('jwt'))
export class RecordingController {
  constructor(
    private readonly classroom: ClassroomService,
    private readonly recording: RecordingService,
  ) {}

  @Post('start')
  @Header('Cache-Control', NO_STORE)
  start(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Body() dto: StartRecordingDto,
  ) {
    return this.classroom.startTeacherRecording(
      req.user.userId,
      room,
      dto.segmentId,
    );
  }

  @Get('segments')
  @Header('Cache-Control', NO_STORE)
  async segments(@Request() req: AuthedRequest, @Param('room') room: string) {
    await this.classroom.assertTeacherOfRoomPublic(req.user.userId, room);
    return { segments: await this.recording.listSegments(room) };
  }

  @Post(':segmentId/stop')
  @Header('Cache-Control', NO_STORE)
  stop(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: StopRecordingDto,
  ) {
    return this.classroom.stopTeacherRecording(
      req.user.userId,
      room,
      segmentId,
      dto,
    );
  }

  // A teacher retrying a failed upload asks again each time: well above the
  // default of 20 a minute would never be needed, but a class behind one school
  // IP should not share a budget with its neighbours' retries.
  @Post(':segmentId/upload-url')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', NO_STORE)
  async uploadUrl(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: RecordingUploadUrlDto,
  ) {
    await this.classroom.assertTeacherOfRoomPublic(req.user.userId, room);
    return {
      ok: true,
      ...(await this.recording.createUploadUrl(
        room,
        req.user.userId,
        segmentId,
        dto.sizeBytes,
      )),
    };
  }

  @Post(':segmentId/complete')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', NO_STORE)
  async complete(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: CompleteRecordingUploadDto,
  ) {
    await this.classroom.assertTeacherOfRoomPublic(req.user.userId, room);
    return {
      ok: true,
      segment: await this.recording.completeUpload(
        room,
        req.user.userId,
        segmentId,
        dto.sizeBytes,
        dto.durationMs,
      ),
    };
  }

  @Post(':segmentId/discard')
  @Header('Cache-Control', NO_STORE)
  discard(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
  ) {
    return this.classroom.discardTeacherRecording(
      req.user.userId,
      room,
      segmentId,
    );
  }
}
