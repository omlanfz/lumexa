// FILE PATH: server/src/classroom/chat/chat.controller.ts
//
// The saved classroom chat — see ChatService for the rules. Everything is scoped
// to a classroom (its room name) and to the signed-in caller; the service decides
// whether they belong in it.
//
//   GET    /classroom/:room/chat                          the saved history (newest page)
//   POST   /classroom/:room/chat                          save a message just sent
//   DELETE /classroom/:room/chat/messages/:author/:id     teacher: delete one message
//   DELETE /classroom/:room/chat                          teacher: clear the whole chat

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('classroom/:room/chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // Opened once when the chat appears, and again for "load earlier": a school may
  // share one IP address, so well above the default of 20 a minute.
  @Get()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  history(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.history(req.user.userId, room, {
      before: positiveInt('before', before),
      limit: positiveInt('limit', limit),
    });
  }

  @Post()
  @Throttle({ default: { limit: 180, ttl: 60_000 } })
  save(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Body() body: { id?: unknown; text?: unknown },
  ) {
    return this.chat.append(req.user.userId, room, {
      id: body?.id,
      text: body?.text,
    });
  }

  @Delete('messages/:author/:id')
  deleteMessage(
    @Request() req: AuthedRequest,
    @Param('room') room: string,
    @Param('author') author: string,
    @Param('id') id: string,
  ) {
    return this.chat.deleteMessage(req.user.userId, room, author, id);
  }

  @Delete()
  clearAll(@Request() req: AuthedRequest, @Param('room') room: string) {
    return this.chat.clearAll(req.user.userId, room);
  }
}

function positiveInt(name: string, value: string | undefined) {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new BadRequestException(`"${name}" must be a whole number.`);
  }
  return n;
}
