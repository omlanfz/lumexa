import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { MemoryChatStorage } from './testing/memory-chat-storage';
import type { ResolvedRoom } from '../room-directory.service';

const T1 = 'teacher-1';
const T2 = 'teacher-2';
const A = 'student-a';
const B = 'student-b';
const C = 'student-c';

const NAMES: Record<string, string> = {
  [T1]: 'Teacher One',
  [T2]: 'Teacher Two',
  [A]: 'Ada',
  [B]: 'Bob',
  [C]: 'Cy',
};

function lesson(studentUserId: string) {
  return { studentUserId } as ResolvedRoom['lessons'][number];
}

describe('ChatService', () => {
  let storage: MemoryChatStorage;
  let rooms: Record<string, ResolvedRoom>;
  let members: {
    batchId: string;
    studentUserId: string;
    joinedAt: Date;
    leftAt: Date | null;
  }[];
  let chatLocked: boolean;
  let service: ChatService;
  let clock: number;

  beforeEach(() => {
    storage = new MemoryChatStorage();
    chatLocked = false;
    clock = Date.UTC(2026, 10, 2, 10, 0, 0);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
    rooms = {
      'lesson-1': {
        room: 'lesson-1',
        kind: 'lesson',
        teacherUserId: T1,
        classType: 'ONE_TO_ONE',
        lessons: [lesson(A)],
      } as ResolvedRoom,
      // The same student and teacher, another course, another lesson.
      'lesson-2': {
        room: 'lesson-2',
        kind: 'lesson',
        teacherUserId: T1,
        classType: 'ONE_TO_ONE',
        lessons: [lesson(A)],
      } as ResolvedRoom,
      // The same student with a NEW teacher.
      'lesson-3': {
        room: 'lesson-3',
        kind: 'lesson',
        teacherUserId: T2,
        classType: 'ONE_TO_ONE',
        lessons: [lesson(A)],
      } as ResolvedRoom,
      'batch-session-1': {
        room: 'batch-session-1',
        kind: 'batch',
        teacherUserId: T1,
        classType: 'BATCH',
        batch: { id: 'batch-1', name: 'B' },
        lessons: [lesson(A), lesson(B), lesson(C)],
      } as ResolvedRoom,
      'batch-session-2': {
        room: 'batch-session-2',
        kind: 'batch',
        teacherUserId: T2,
        classType: 'BATCH',
        batch: { id: 'batch-1', name: 'B' },
        lessons: [lesson(A), lesson(B), lesson(C)],
      } as ResolvedRoom,
      'trial-1': {
        room: 'trial-1',
        kind: 'trial',
        teacherUserId: T1,
        classType: 'ONE_TO_ONE',
        lessons: [],
      } as ResolvedRoom,
    };
    members = [
      {
        batchId: 'batch-1',
        studentUserId: A,
        joinedAt: new Date(clock - 1e9),
        leftAt: null,
      },
      {
        batchId: 'batch-1',
        studentUserId: B,
        joinedAt: new Date(clock - 1e9),
        leftAt: null,
      },
    ];
    const prisma = {
      user: {
        findUnique: ({ where }: { where: { id?: string } }) =>
          Promise.resolve(
            where.id && NAMES[where.id]
              ? { id: where.id, fullName: NAMES[where.id] }
              : null,
          ),
      },
      booking: { findUnique: () => Promise.resolve(null) },
      batchMember: {
        findFirst: ({
          where,
        }: {
          where: { batchId: string; studentUserId: string; leftAt: null };
        }) => {
          const found = members
            .filter(
              (m) =>
                m.batchId === where.batchId &&
                m.studentUserId === where.studentUserId &&
                m.leftAt === null,
            )
            .sort((x, y) => y.joinedAt.getTime() - x.joinedAt.getTime())[0];
          return Promise.resolve(found ? { joinedAt: found.joinedAt } : null);
        },
      },
    };
    const directory = {
      resolve: (room: string) =>
        rooms[room]
          ? Promise.resolve(rooms[room])
          : Promise.reject(new Error('no room')),
    };
    const daily = {
      getClassState: () =>
        Promise.resolve(chatLocked ? { chatLocked: true } : {}),
    };
    service = new ChatService(
      prisma as never,
      directory as never,
      daily as never,
      storage,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const say = (user: string, room: string, id: string, text: string) =>
    service.append(user, room, { id, text });
  const texts = async (user: string, room: string) => {
    const h = await service.history(user, room);
    return h.messages.map((m) => m.text);
  };

  describe('1:1 class', () => {
    it('keeps the conversation across lessons and curricula with the same teacher', async () => {
      await say(T1, 'lesson-1', 'm1', 'Welcome!');
      await say(A, 'lesson-1', 'm2', 'Hi sir');
      // Next lesson, another program, same teacher and student.
      expect(await texts(A, 'lesson-2')).toEqual(['Welcome!', 'Hi sir']);
      expect(await texts(T1, 'lesson-2')).toEqual(['Welcome!', 'Hi sir']);
    });

    it('starts empty the moment the student has a new teacher', async () => {
      await say(T1, 'lesson-1', 'm1', 'Welcome!');
      expect(await texts(A, 'lesson-3')).toEqual([]);
      await say(T2, 'lesson-3', 'n1', 'Hello from the new teacher');
      expect(await texts(A, 'lesson-3')).toEqual([
        'Hello from the new teacher',
      ]);
      expect(await texts(T2, 'lesson-3')).toEqual([
        'Hello from the new teacher',
      ]);
    });

    it('is private to its teacher and student', async () => {
      await expect(service.history(B, 'lesson-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(say(B, 'lesson-1', 'x', 'hi')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.history(T2, 'lesson-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('stores the sender, name and role itself — the browser only supplies text and an id', async () => {
      await say(A, 'lesson-1', 'm1', 'hello');
      const [m] = (await service.history(A, 'lesson-1')).messages;
      expect(m).toMatchObject({
        id: 'm1',
        fromUserId: A,
        fromName: 'Ada',
        fromRole: 'STUDENT',
        text: 'hello',
      });
      await say(T1, 'lesson-1', 'm2', 'hey');
      const last = (await service.history(A, 'lesson-1')).messages.at(-1);
      expect(last).toMatchObject({
        fromUserId: T1,
        fromRole: 'TEACHER',
        fromName: 'Teacher One',
      });
    });
  });

  describe('batch class', () => {
    it('is shared by the teacher and the members of the same batch', async () => {
      await say(T1, 'batch-session-1', 'm1', 'Hello batch');
      await say(B, 'batch-session-1', 'm2', 'Hi!');
      expect(await texts(A, 'batch-session-1')).toEqual(['Hello batch', 'Hi!']);
      expect(await texts(B, 'batch-session-1')).toEqual(['Hello batch', 'Hi!']);
    });

    it('a student who left the batch can no longer read or write, the others still can', async () => {
      await say(T1, 'batch-session-1', 'm1', 'Hello batch');
      members.find((m) => m.studentUserId === A)!.leftAt = new Date(clock);
      await expect(
        service.history(A, 'batch-session-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(say(A, 'batch-session-1', 'x', 'hi')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(await texts(B, 'batch-session-1')).toEqual(['Hello batch']);
    });

    it('a student who joins late starts with an empty chat; the original members keep theirs', async () => {
      await say(T1, 'batch-session-1', 'm1', 'First class');
      await say(A, 'batch-session-1', 'm2', 'Hi');
      clock += 60_000;
      members.push({
        batchId: 'batch-1',
        studentUserId: C,
        joinedAt: new Date(clock),
        leftAt: null,
      });
      expect(await texts(C, 'batch-session-1')).toEqual([]);
      await say(T1, 'batch-session-1', 'm3', 'Welcome Cy');
      expect(await texts(C, 'batch-session-1')).toEqual(['Welcome Cy']);
      expect(await texts(A, 'batch-session-1')).toEqual([
        'First class',
        'Hi',
        'Welcome Cy',
      ]);
      // The teacher sees everything.
      expect(await texts(T1, 'batch-session-1')).toEqual([
        'First class',
        'Hi',
        'Welcome Cy',
      ]);
    });

    it('a new teacher for the batch starts a fresh, empty chat', async () => {
      await say(T1, 'batch-session-1', 'm1', 'Hello batch');
      expect(await texts(A, 'batch-session-2')).toEqual([]);
      expect(await texts(T2, 'batch-session-2')).toEqual([]);
    });

    it('a student who is not in the class is refused', async () => {
      await expect(
        service.history('stranger', 'batch-session-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deleting (teacher only)', () => {
    beforeEach(async () => {
      await say(T1, 'lesson-1', 'm1', 'teacher text');
      await say(A, 'lesson-1', 'm2', 'student text');
      await say(A, 'lesson-1', 'm3', 'another student text');
    });

    it('the teacher can delete a student’s message and their own', async () => {
      expect(await service.deleteMessage(T1, 'lesson-1', A, 'm2')).toEqual({
        deleted: true,
      });
      expect(await service.deleteMessage(T1, 'lesson-1', T1, 'm1')).toEqual({
        deleted: true,
      });
      expect(await texts(A, 'lesson-1')).toEqual(['another student text']);
      expect(await service.deleteMessage(T1, 'lesson-1', A, 'm2')).toEqual({
        deleted: false,
      });
    });

    it('removes the stored object when its last message is deleted', async () => {
      await service.deleteMessage(T1, 'lesson-1', T1, 'm1');
      expect(
        [...storage.objects.keys()].some((k) => k.endsWith(`/${T1}.json`)),
      ).toBe(false);
    });

    it('a student cannot delete anything, not even their own message', async () => {
      await expect(
        service.deleteMessage(A, 'lesson-1', A, 'm2'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.clearAll(A, 'lesson-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(await texts(A, 'lesson-1')).toHaveLength(3);
    });

    it('clear all empties the conversation for everyone in it, and chatting goes on', async () => {
      expect(await service.clearAll(T1, 'lesson-1')).toEqual({ cleared: true });
      expect(await texts(A, 'lesson-2')).toEqual([]);
      expect(await texts(T1, 'lesson-1')).toEqual([]);
      expect(storage.objects.size).toBe(0);
      await say(A, 'lesson-1', 'm9', 'after');
      expect(await texts(T1, 'lesson-1')).toEqual(['after']);
    });

    it('clearing one conversation leaves the others alone', async () => {
      await say(T2, 'lesson-3', 'n1', 'other teacher');
      await service.clearAll(T1, 'lesson-1');
      expect(await texts(A, 'lesson-3')).toEqual(['other teacher']);
    });
  });

  describe('writing', () => {
    it('saving the same message twice stores it once', async () => {
      const first = await say(A, 'lesson-1', 'm1', 'hello');
      const again = await say(A, 'lesson-1', 'm1', 'hello');
      expect(again).toEqual(first);
      expect(await texts(A, 'lesson-1')).toEqual(['hello']);
    });

    it('two messages sent at the same moment are both kept', async () => {
      await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          say(A, 'lesson-1', `m${i}`, `text ${i}`),
        ),
      );
      expect(await texts(A, 'lesson-1')).toHaveLength(12);
    });

    it('keeps line breaks', async () => {
      await say(A, 'lesson-1', 'm1', 'line one\nline two');
      expect(await texts(A, 'lesson-1')).toEqual(['line one\nline two']);
    });

    it('rejects bad ids and bad text', async () => {
      await expect(say(A, 'lesson-1', 'bad id!', 'x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(say(A, 'lesson-1', 'm1', '   ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        say(A, 'lesson-1', 'm1', 'x'.repeat(501)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a student cannot save a message while the teacher has locked the chat; the teacher can', async () => {
      chatLocked = true;
      await expect(say(A, 'lesson-1', 'm1', 'sneaky')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await say(T1, 'lesson-1', 'm2', 'announcement');
      chatLocked = false;
      expect(await texts(A, 'lesson-1')).toEqual(['announcement']);
    });
  });

  describe('classes whose chat is not saved', () => {
    it('a free trial is live-only', async () => {
      expect(await service.history(T1, 'trial-1')).toEqual({
        enabled: false,
        messages: [],
        hasMore: false,
      });
      expect(await say(T1, 'trial-1', 'm1', 'hi')).toEqual({ stored: false });
      expect(storage.objects.size).toBe(0);
    });

    it('without chat storage configured nothing is saved and nothing fails', async () => {
      storage.configured = false;
      expect((await service.history(A, 'lesson-1')).enabled).toBe(false);
      expect(await say(A, 'lesson-1', 'm1', 'hi')).toEqual({ stored: false });
      expect(await service.clearAll(T1, 'lesson-1')).toEqual({
        cleared: false,
      });
    });

    it('a storage outage is reported, not swallowed', async () => {
      storage.down = true;
      await expect(service.history(A, 'lesson-1')).rejects.toThrow(
        /could not be loaded/,
      );
      await expect(say(A, 'lesson-1', 'm1', 'hi')).rejects.toThrow(
        /could not be saved/,
      );
    });
  });

  describe('history pages', () => {
    it('returns the newest page oldest-first, and older pages on request, across months', async () => {
      // 5 messages in October, 5 in November.
      clock = Date.UTC(2026, 9, 20, 10);
      for (let i = 0; i < 5; i++) await say(A, 'lesson-1', `o${i}`, `oct ${i}`);
      clock = Date.UTC(2026, 10, 5, 10);
      for (let i = 0; i < 5; i++)
        await say(T1, 'lesson-1', `n${i}`, `nov ${i}`);

      const newest = await service.history(A, 'lesson-1', { limit: 4 });
      expect(newest.messages.map((m) => m.text)).toEqual([
        'nov 1',
        'nov 2',
        'nov 3',
        'nov 4',
      ]);
      expect(newest.hasMore).toBe(true);

      const older = await service.history(A, 'lesson-1', {
        limit: 4,
        before: newest.messages[0].sentAt,
      });
      // The boundary message itself may be repeated (the browser de-duplicates).
      expect(older.messages.map((m) => m.text)).toEqual([
        'oct 3',
        'oct 4',
        'nov 0',
        'nov 1',
      ]);

      const oldest = await service.history(A, 'lesson-1', {
        limit: 4,
        before: older.messages[0].sentAt,
      });
      expect(oldest.messages.map((m) => m.text)).toEqual([
        'oct 0',
        'oct 1',
        'oct 2',
        'oct 3',
      ]);
      expect(oldest.hasMore).toBe(false);
    });

    it('everything fits in one page when it is short', async () => {
      await say(A, 'lesson-1', 'm1', 'one');
      const h = await service.history(A, 'lesson-1');
      expect(h).toMatchObject({ enabled: true, hasMore: false });
    });
  });
});
