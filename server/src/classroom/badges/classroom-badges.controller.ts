// FILE PATH: server/src/classroom/badges/classroom-badges.controller.ts
//
// The Classroom Badge System's API. Who may do what is decided by
// ClassroomBadgesService against the class itself; the role guards here only
// keep the wrong kind of account out.

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ClassroomBadgesService } from './classroom-badges.service';
import { AwardBadgeDto, UndoBadgeDto } from './dto/badge.dto';

/** What the JWT guard puts on the request (see JwtStrategy.validate). */
interface AuthedRequest {
  user: { userId: string; role: string };
}

@Controller('classroom-badges')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClassroomBadgesController {
  constructor(private readonly badges: ClassroomBadgesService) {}

  /** The 16 badges (id, emoji, name, what it recognises). */
  @Get('catalog')
  catalog() {
    return this.badges.catalog();
  }

  /** A student's own collection. */
  @Get('mine')
  @Roles(Role.STUDENT)
  mine(@Req() req: AuthedRequest) {
    return this.badges.mine(req.user.userId);
  }

  /** POST /classroom-badges/:room/award — the class's teacher only. */
  @Post(':room/award')
  @Roles(Role.TEACHER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  award(
    @Param('room') room: string,
    @Body() dto: AwardBadgeDto,
    @Req() req: AuthedRequest,
  ) {
    return this.badges.award(req.user.userId, room, dto);
  }

  /** POST /classroom-badges/:room/undo — take back an award just made. */
  @Post(':room/undo')
  @Roles(Role.TEACHER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  undo(
    @Param('room') room: string,
    @Body() dto: UndoBadgeDto,
    @Req() req: AuthedRequest,
  ) {
    return this.badges.undo(req.user.userId, room, dto.requestId);
  }
}
