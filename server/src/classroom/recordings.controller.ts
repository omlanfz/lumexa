// FILE PATH: server/src/classroom/recordings.controller.ts
//
// Watching class recordings. The files are in a private bucket, so a student
// never gets a link until RecordingLibraryService has checked that they belong
// to the class — and what they get is a signed URL that expires.
//
//   GET /recordings/mine                    a student's recordings, class by class
//   GET /recordings/booking/:bookingId      the parts of one booked class that
//                                           the asker may watch (a parent's way
//                                           to their child's recordings)
//   GET /recordings/:segmentId/playback     a signed URL to stream one part
//                                           (a student of the class, a booked
//                                           child's parent, the class's teacher,
//                                           an admin)
//   GET /recordings/classes/:kind/:id       an admin's view of one class: every
//                                           part, whatever its state

import {
  Controller,
  Get,
  Header,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RecordingLibraryService } from './recording-library.service';

/** What the JWT guard puts on the request (see JwtStrategy.validate). */
interface AuthedRequest {
  user: { userId: string; role: string; email?: string };
}

// Signed URLs are bearer tokens and the list is private: never cached.
const NO_STORE = 'no-store';

/** The kinds of class an admin can open, as the Classes list names them. */
const CLASS_KINDS = {
  BOOKING: 'BOOKING',
  LESSON: 'LESSON',
  SESSION: 'SESSION',
};

function viewerOf(req: AuthedRequest) {
  return {
    userId: req.user.userId,
    role: req.user.role,
    email: req.user.email,
  };
}

@Controller('recordings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RecordingsController {
  constructor(private readonly library: RecordingLibraryService) {}

  // The lists are opened by a whole class at once (a teacher says "watch the
  // recording"), often behind one school IP: the same allowance as playback.
  @Get('mine')
  @Roles(Role.STUDENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', NO_STORE)
  mine(@Req() req: AuthedRequest) {
    return this.library.listForStudent(req.user.userId, req.user.email);
  }

  @Get('booking/:bookingId')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', NO_STORE)
  forBooking(
    @Req() req: AuthedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.library.listForBooking(viewerOf(req), bookingId);
  }

  @Get(':segmentId/playback')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.PARENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', NO_STORE)
  playback(
    @Req() req: AuthedRequest,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
  ) {
    return this.library.playback(viewerOf(req), segmentId);
  }

  @Get('classes/:kind/:id')
  @Roles(Role.ADMIN)
  @Header('Cache-Control', NO_STORE)
  forClass(
    @Param('kind', new ParseEnumPipe(CLASS_KINDS))
    kind: 'BOOKING' | 'LESSON' | 'SESSION',
    @Param('id') id: string,
  ) {
    return this.library.listForClass(kind, id);
  }
}
