// The chat routes over real HTTP, with the service's collaborators faked: proves
// the routes are wired and guarded, the module's storage token resolves, and bad
// input is refused before it reaches storage.

import 'reflect-metadata';
import { ExecutionContext, INestApplication, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../../prisma.service';
import { DailyRoomsService } from '../daily-rooms.service';
import { RoomDirectoryService } from '../room-directory.service';
import type { ResolvedRoom } from '../room-directory.service';
import { ChatController } from './chat.controller';
import { CHAT_STORAGE, ChatStorageService } from './chat-storage.service';
import { ChatService } from './chat.service';
import { MemoryChatStorage } from './testing/memory-chat-storage';

const room = {
  room: 'lesson-1',
  kind: 'lesson',
  teacherUserId: 'teacher',
  lessons: [{ studentUserId: 'student' }],
} as unknown as ResolvedRoom;

describe('chat HTTP routes', () => {
  let app: INestApplication;
  let storage: MemoryChatStorage;
  let caller = 'student';

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    storage = new MemoryChatStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
      controllers: [ChatController],
      providers: [
        ChatService,
        { provide: CHAT_STORAGE, useValue: storage },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: () => Promise.resolve({ fullName: 'Someone' }),
            },
          },
        },
        {
          provide: RoomDirectoryService,
          useValue: { resolve: () => Promise.resolve(room) },
        },
        {
          provide: DailyRoomsService,
          useValue: { getClassState: () => Promise.resolve({}) },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<{ user: unknown }>().user = {
            userId: caller,
          };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  const http = () => request(app.getHttpServer() as App);

  it('saves a message and reads it back; the reader is told nothing is cached', async () => {
    caller = 'student';
    await http()
      .post('/classroom/lesson-1/chat')
      .send({ id: 'm1', text: 'hello\nthere' })
      .expect(201);
    const res = await http().get('/classroom/lesson-1/chat').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toMatchObject({
      enabled: true,
      hasMore: false,
      messages: [
        {
          id: 'm1',
          text: 'hello\nthere',
          fromUserId: 'student',
          fromRole: 'STUDENT',
        },
      ],
    });
  });

  it('refuses bad input before it reaches storage', async () => {
    caller = 'student';
    await http()
      .post('/classroom/lesson-1/chat')
      .send({ id: 'm2', text: '   ' })
      .expect(400);
    await http()
      .post('/classroom/lesson-1/chat')
      .send({ text: 'no id' })
      .expect(400);
    await http().get('/classroom/lesson-1/chat?before=abc').expect(400);
    await http().get('/classroom/lesson-1/chat?limit=-3').expect(400);
  });

  it('only the teacher can delete — one message or all', async () => {
    caller = 'student';
    await http()
      .delete('/classroom/lesson-1/chat/messages/student/m1')
      .expect(403);
    await http().delete('/classroom/lesson-1/chat').expect(403);

    caller = 'teacher';
    await http()
      .delete('/classroom/lesson-1/chat/messages/student/m1')
      .expect(200, { deleted: true });
    await http()
      .post('/classroom/lesson-1/chat')
      .send({ id: 'm3', text: 'x' })
      .expect(201);
    await http()
      .delete('/classroom/lesson-1/chat')
      .expect(200, { cleared: true });
    const res = await http().get('/classroom/lesson-1/chat').expect(200);
    expect((res.body as { messages: unknown[] }).messages).toEqual([]);
  });

  it('a stranger is refused', async () => {
    caller = 'stranger';
    await http().get('/classroom/lesson-1/chat').expect(403);
  });

  it('the module’s storage token resolves to the R2 service', async () => {
    // The same wiring ClassroomModule declares.
    const ref = await Test.createTestingModule({
      providers: [
        ChatStorageService,
        { provide: CHAT_STORAGE, useExisting: ChatStorageService },
      ],
    }).compile();
    expect(ref.get(CHAT_STORAGE)).toBeInstanceOf(ChatStorageService);
  });
});
