// FILE PATH: server/src/classroom/chat/chat.service.ts
//
// The saved classroom chat. Live delivery is unchanged — the browsers still send
// each other Daily app messages — but every message is ALSO sent here, which keeps
// it in R2 (see chat-storage.service.ts and chat-thread.ts) so that it is still
// there in the next class and for someone who joins late.
//
// WHO SEES WHAT (decided here, never by the browser):
//
//   1:1 class      the teacher and the student of that conversation. The thread is
//                  "this teacher + this student", so it survives a change of
//                  curriculum; a new teacher is a new, empty thread.
//   batch class    the teacher and the CURRENT members of the batch. The thread is
//                  "this batch + this teacher". A student who has left the batch is
//                  refused; a student who joined late sees only what was said after
//                  they joined (BatchMember.joinedAt); a new teacher is a new,
//                  empty thread.
//   free trial     not saved (the guest has no account; it is one class).
//
// Only the room's teacher can delete — one message (anyone's) or the whole chat.
//
// If chat storage is not configured, or a class is not one that is saved, reads
// answer "not enabled" and writes are no-ops: chat keeps working live, exactly as
// it did before saving existed.

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DailyRoomsService } from '../daily-rooms.service';
import { RoomDirectoryService } from '../room-directory.service';
import type { ResolvedRoom } from '../room-directory.service';
import { DEMO_STUDENT_EMAIL } from '../room-ref.util';
import { CHAT_STORAGE, describeStorageError } from './chat-storage.service';
import type { ChatStorage } from './chat-storage.service';
import {
  MAX_MESSAGES_PER_OBJECT,
  MAX_PAGE_SIZE,
  authorSegment,
  batchPrefix,
  byTime,
  isValidMessageId,
  monthOf,
  normalizeChatText,
  objectKeyFor,
  oneToOnePrefix,
  parseChatObject,
  parseObjectKey,
  roomPrefix,
  serializeChatObject,
} from './chat-thread';
import type { ChatRole, StoredChatMessage } from './chat-thread';

/** What a browser is told about a saved message. */
export interface ChatMessageView {
  id: string;
  text: string;
  sentAt: number;
  fromUserId: string;
  fromName: string;
  fromRole: ChatRole;
}

export interface ChatHistory {
  /** False when this class's chat is not saved (a free trial, or no storage set up). */
  enabled: boolean;
  messages: ChatMessageView[];
  /** Older messages exist than the ones returned. */
  hasMore: boolean;
}

interface ChatAccess {
  prefix: string;
  role: ChatRole;
  /** A student sees nothing sent before this (epoch ms); the teacher sees all. */
  sinceMs: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  /** One read-modify-write at a time per object (this process). Each object has a
   * single author, so the only writers racing are that person's own devices and
   * the teacher deleting; across servers the window is just that narrow. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: RoomDirectoryService,
    private readonly rooms: DailyRoomsService,
    @Inject(CHAT_STORAGE) private readonly storage: ChatStorage,
  ) {}

  // ─── Who may use which conversation ──────────────────────────────────────

  /** The conversation this person has in this classroom, or null when the class
   * is not one whose chat is saved. Throws Forbidden for someone who does not
   * belong in it (a student who has left the batch included). */
  private async accessFor(
    userId: string,
    roomName: string,
  ): Promise<ChatAccess | null> {
    if (!this.storage.isConfigured()) return null;

    const room = await this.directory.resolve(roomName);
    const isTeacher = room.teacherUserId === userId;
    const role: ChatRole = isTeacher ? 'TEACHER' : 'STUDENT';
    const refuse = () =>
      new ForbiddenException('You are not part of this classroom.');

    switch (room.kind) {
      case 'trial':
        return null;

      case 'lesson': {
        const studentUserId = room.lessons[0]?.studentUserId;
        if (!studentUserId) return null;
        if (!isTeacher && userId !== studentUserId) throw refuse();
        return {
          prefix: oneToOnePrefix(room.teacherUserId, studentUserId),
          role,
          sinceMs: 0,
        };
      }

      case 'batch':
        return this.batchAccess(room, userId, isTeacher, role, refuse);

      case 'booking': {
        const booking = await this.prisma.booking.findUnique({
          where: { id: room.room },
          select: { studentUserId: true },
        });
        // A booking of a child without an account has no one to key a
        // conversation on.
        if (!booking?.studentUserId) return null;
        if (!isTeacher && userId !== booking.studentUserId) throw refuse();
        return {
          prefix: oneToOnePrefix(room.teacherUserId, booking.studentUserId),
          role,
          sinceMs: 0,
        };
      }

      case 'demo': {
        const student = await this.prisma.user.findUnique({
          where: { email: DEMO_STUDENT_EMAIL },
          select: { id: true },
        });
        if (!student) return null;
        if (!isTeacher && userId !== student.id) throw refuse();
        return {
          prefix: oneToOnePrefix(room.teacherUserId, student.id),
          role,
          sinceMs: 0,
        };
      }
    }
  }

  private async batchAccess(
    room: ResolvedRoom,
    userId: string,
    isTeacher: boolean,
    role: ChatRole,
    refuse: () => Error,
  ): Promise<ChatAccess> {
    // An old-style batch room has no batch record to name: its conversation is
    // the room's own, for whoever has a place in it.
    if (!room.batch) {
      if (!isTeacher && !room.lessons.some((l) => l.studentUserId === userId)) {
        throw refuse();
      }
      return { prefix: roomPrefix(room.room), role, sinceMs: 0 };
    }

    const prefix = batchPrefix(room.batch.id, room.teacherUserId);
    if (isTeacher) return { prefix, role, sinceMs: 0 };

    // A student: still in the batch (a student who left is refused even if their
    // row in an already-running class is still there), and they see only what
    // was said since they joined.
    const member = await this.prisma.batchMember.findFirst({
      where: {
        batchId: room.batch.id,
        studentUserId: userId,
        leftAt: null,
      },
      orderBy: { joinedAt: 'desc' },
      select: { joinedAt: true },
    });
    const inThisClass = room.lessons.some((l) => l.studentUserId === userId);
    if (!member || !inThisClass) throw refuse();
    return { prefix, role, sinceMs: member.joinedAt.getTime() };
  }

  // ─── Reading ─────────────────────────────────────────────────────────────

  /** The newest `limit` messages this person may see — or, with `before`, the
   * ones just before that time — oldest first. */
  async history(
    userId: string,
    roomName: string,
    opts: { before?: number; limit?: number } = {},
  ): Promise<ChatHistory> {
    const access = await this.accessFor(userId, roomName);
    if (!access) return { enabled: false, messages: [], hasMore: false };

    const limit = Math.min(
      Math.max(Math.floor(opts.limit ?? MAX_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    const before = opts.before ?? Number.POSITIVE_INFINITY;

    let objects: { key: string; month: string }[];
    try {
      const keys = await this.storage.listKeys(access.prefix);
      objects = keys.flatMap((key) => {
        const parsed = parseObjectKey(access.prefix, key);
        return parsed ? [{ key, month: parsed.month }] : [];
      });
    } catch (err) {
      this.logger.error(
        `Could not list chat ${access.prefix}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The chat history could not be loaded right now.',
      );
    }

    const months = [...new Set(objects.map((o) => o.month))].sort().reverse();
    const earliestMonth = access.sinceMs > 0 ? monthOf(access.sinceMs) : '';
    const latestMonth = Number.isFinite(before) ? monthOf(before) : '9999-99';

    // Newest month first; stop as soon as there are more than `limit` visible
    // messages — then there is certainly something older.
    const collected: StoredChatMessage[] = [];
    try {
      for (const month of months) {
        if (month > latestMonth || month < earliestMonth) continue;
        const inMonth = objects.filter((o) => o.month === month);
        const lists = await Promise.all(
          inMonth.map(async (o) =>
            parseChatObject(await this.storage.getText(o.key)),
          ),
        );
        for (const m of lists.flat()) {
          if (m.sentAt >= access.sinceMs && m.sentAt <= before)
            collected.push(m);
        }
        if (collected.length > limit) break;
      }
    } catch (err) {
      this.logger.error(
        `Could not read chat ${access.prefix}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The chat history could not be loaded right now.',
      );
    }

    collected.sort(byTime);
    const hasMore = collected.length > limit;
    return {
      enabled: true,
      messages: collected.slice(-limit),
      hasMore,
    };
  }

  // ─── Writing ─────────────────────────────────────────────────────────────

  /** Saves a message the caller has just sent. The sender, their name and role and
   * the time are the SERVER's — the browser only supplies the text and an id.
   * Saving the same id again is a no-op (a retry). */
  async append(
    userId: string,
    roomName: string,
    input: { id: unknown; text: unknown },
  ): Promise<{ stored: boolean; sentAt?: number }> {
    if (!isValidMessageId(input.id)) {
      throw new BadRequestException('"id" is not a valid message id.');
    }
    const text = normalizeChatText(input.text);
    if (text === null) {
      throw new BadRequestException(
        'A message must have some text and be at most 500 characters.',
      );
    }

    const access = await this.accessFor(userId, roomName);
    if (!access) return { stored: false };

    // The teacher's lock is enforced here too, not only by the browsers: a
    // student cannot get a message into the saved chat by calling this directly.
    if (access.role === 'STUDENT') {
      const state = await this.rooms.getClassState(roomName);
      if (state?.chatLocked === true) {
        throw new ForbiddenException('Chat is locked by the teacher.');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const now = Date.now();
    const message: StoredChatMessage = {
      id: input.id,
      text,
      sentAt: now,
      fromUserId: userId,
      fromName:
        user?.fullName ?? (access.role === 'TEACHER' ? 'Teacher' : 'Student'),
      fromRole: access.role,
    };
    const key = objectKeyFor(access.prefix, monthOf(now), userId);

    try {
      return await this.withLock(key, async () => {
        const existing = parseChatObject(await this.storage.getText(key));
        const same = existing.find(
          (m) => m.id === message.id && m.fromUserId === userId,
        );
        if (same) return { stored: true, sentAt: same.sentAt };
        if (existing.length >= MAX_MESSAGES_PER_OBJECT) {
          this.logger.warn(
            `Chat object ${key} is full; a message was not saved.`,
          );
          return { stored: false };
        }
        existing.push(message);
        await this.storage.putText(key, serializeChatObject(existing));
        return { stored: true, sentAt: message.sentAt };
      });
    } catch (err) {
      this.logger.error(
        `Could not save a chat message to ${key}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The message could not be saved right now.',
      );
    }
  }

  /** Teacher only: removes one message — whoever sent it — from the saved chat.
   * Returns whether it was there. */
  async deleteMessage(
    userId: string,
    roomName: string,
    authorUserId: string,
    messageId: string,
  ): Promise<{ deleted: boolean }> {
    if (!isValidMessageId(messageId) || !authorUserId) {
      throw new BadRequestException('That is not a valid message.');
    }
    const access = await this.requireTeacherAccess(userId, roomName);
    if (!access) return { deleted: false };

    const authorFile = authorSegment(authorUserId);
    try {
      const keys = (await this.storage.listKeys(access.prefix)).filter(
        (key) => {
          const parsed = parseObjectKey(access.prefix, key);
          return parsed?.author === authorFile;
        },
      );
      let deleted = false;
      for (const key of keys) {
        const removed = await this.withLock(key, async () => {
          const existing = parseChatObject(await this.storage.getText(key));
          const kept = existing.filter(
            (m) => !(m.id === messageId && m.fromUserId === authorUserId),
          );
          if (kept.length === existing.length) return false;
          if (kept.length === 0) await this.storage.deleteObject(key);
          else await this.storage.putText(key, serializeChatObject(kept));
          return true;
        });
        deleted = deleted || removed;
      }
      return { deleted };
    } catch (err) {
      this.logger.error(
        `Could not delete a chat message in ${access.prefix}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The message could not be deleted right now.',
      );
    }
  }

  /** Teacher only: removes the whole saved conversation (for everyone in it). */
  async clearAll(
    userId: string,
    roomName: string,
  ): Promise<{ cleared: boolean }> {
    const access = await this.requireTeacherAccess(userId, roomName);
    if (!access) return { cleared: false };
    try {
      const keys = (await this.storage.listKeys(access.prefix)).filter(
        (key) => parseObjectKey(access.prefix, key) !== null,
      );
      for (const key of keys) {
        await this.withLock(key, () => this.storage.deleteObject(key));
      }
      return { cleared: true };
    } catch (err) {
      this.logger.error(
        `Could not clear chat ${access.prefix}: ${describeStorageError(err)}`,
      );
      throw new ServiceUnavailableException(
        'The chat could not be cleared right now.',
      );
    }
  }

  private async requireTeacherAccess(
    userId: string,
    roomName: string,
  ): Promise<ChatAccess | null> {
    const access = await this.accessFor(userId, roomName);
    if (access && access.role !== 'TEACHER') {
      throw new ForbiddenException(
        'Only the teacher can delete chat messages.',
      );
    }
    return access;
  }

  private async withLock<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(work);
    const tail = run.catch(() => undefined);
    this.locks.set(key, tail);
    try {
      return await run;
    } finally {
      if (this.locks.get(key) === tail) this.locks.delete(key);
    }
  }
}
