// FILE PATH: server/src/classroom/badges/classroom-badges.service.ts
//
// The Lumexa Classroom Badge System: a teacher recognises a student in class
// with one of 16 badges (see badge-catalog.ts); the student sees a short
// celebration if they are in the room, and keeps the badge in "My Badges".
//
//   - Only the teacher of that class can award or undo (checked against the
//     class itself, not against anything the browser says), only to students
//     of that class, and never to themselves.
//   - The award is saved FIRST; the celebration is a notification sent after,
//     to exactly the recipients' own connections (LiveKit data message with
//     destination identities — never a broadcast the browser filters). If it
//     cannot be delivered the award still stands and the teacher is told.
//   - Idempotent: the browser names each award action with a requestId, and
//     (requestId, student) can only be stored once, so a double click or a
//     retry cannot double-award. A later, separate award is a new action.
//   - Undo revokes (sets revokedAt) for a couple of minutes after the award,
//     so the collection stays consistent and there is still a record.
//
// No points, levels, streaks or rankings — recognition only.

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  LiveKitRoomsService,
  type RoomConnection,
} from '../livekit-rooms.service';
import { RoomDirectoryService } from '../room-directory.service';
import { DEMO_STUDENT_EMAIL } from '../room-ref.util';
import { BADGE_CATALOG, describeBadge, findBadge } from './badge-catalog';

/** How long after awarding the teacher can still undo it. */
export const BADGE_UNDO_WINDOW_MS = 2 * 60_000;

export interface AwardResult {
  awardId: string;
  studentUserId: string;
  studentName: string;
  /** false when this was a repeat of an award already saved (a retry). */
  created: boolean;
  /** true when the student was in the classroom and was sent the celebration. */
  notified: boolean;
  /** true when this award had already been undone. */
  revoked: boolean;
}

@Injectable()
export class ClassroomBadgesService {
  private readonly logger = new Logger(ClassroomBadgesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: RoomDirectoryService,
    private readonly rooms: LiveKitRoomsService,
  ) {}

  catalog() {
    return { badges: BADGE_CATALOG };
  }

  // ─── Award ──────────────────────────────────────────────────────────────────

  async award(
    teacherUserId: string,
    room: string,
    dto: { badgeId: string; studentUserIds: string[]; requestId: string },
  ) {
    const badge = findBadge(dto.badgeId);
    if (!badge) throw new BadRequestException('That is not a classroom badge.');

    const students = await this.studentsOfClass(teacherUserId, room);

    const recipients = [...new Set(dto.studentUserIds)];
    if (recipients.length === 0) {
      throw new BadRequestException('Choose at least one student.');
    }
    if (recipients.includes(teacherUserId)) {
      throw new BadRequestException('You cannot award a badge to yourself.');
    }
    if (recipients.some((id) => !students.has(id))) {
      throw new BadRequestException(
        'Some of the chosen students are not in this class.',
      );
    }

    // 1. Save. Nothing is sent to anyone until it is stored.
    const saved: {
      id: string;
      studentUserId: string;
      createdAt: Date;
      revokedAt: Date | null;
      created: boolean;
    }[] = [];
    for (const studentUserId of recipients) {
      const lessonId = students.get(studentUserId)!.lessonId;
      try {
        const row = await this.prisma.classroomBadgeAward.create({
          data: {
            badgeId: badge.id,
            requestId: dto.requestId,
            studentUserId,
            awardedByUserId: teacherUserId,
            scheduledLessonId: lessonId,
            room,
          },
        });
        saved.push({ ...row, created: true });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Already stored under this requestId: a retry or a double click.
        const existing = await this.prisma.classroomBadgeAward.findUnique({
          where: {
            requestId_studentUserId: {
              requestId: dto.requestId,
              studentUserId,
            },
          },
        });
        if (
          !existing ||
          existing.badgeId !== badge.id ||
          existing.awardedByUserId !== teacherUserId ||
          existing.room !== room
        ) {
          // The id was used for something else — a bug, not a retry.
          throw new ConflictException(
            'That request id was already used for a different award.',
          );
        }
        saved.push({ ...existing, created: false });
      }
    }

    // 2. Tell the students who were just awarded (and only them).
    const fresh = saved.filter((a) => a.created);
    const notified = await this.celebrate(room, fresh, badge);

    const created = fresh.length;
    if (created > 0) {
      this.logger.log(
        `Badge ${badge.id} awarded to ${created} student(s) in ${room} by ${teacherUserId}`,
      );
    }

    const awards: AwardResult[] = saved.map((a) => ({
      awardId: a.id,
      studentUserId: a.studentUserId,
      studentName: students.get(a.studentUserId)!.name,
      created: a.created,
      notified: notified.has(a.id),
      revoked: a.revokedAt !== null,
    }));
    const firstAt = Math.min(...saved.map((a) => a.createdAt.getTime()));

    return {
      ok: true as const,
      requestId: dto.requestId,
      badge: { id: badge.id, emoji: badge.emoji, name: badge.name },
      awards,
      undoUntil: new Date(firstAt + BADGE_UNDO_WINDOW_MS).toISOString(),
    };
  }

  /** Sends each newly awarded student their celebration, to their own
   * connections in the room. Returns the ids of the awards that reached
   * someone; a failure to deliver is logged and never undoes the award. */
  private async celebrate(
    room: string,
    awards: { id: string; studentUserId: string }[],
    badge: { id: string; emoji: string; name: string },
  ): Promise<Set<string>> {
    const delivered = new Set<string>();
    if (awards.length === 0) return delivered;

    let people: RoomConnection[];
    try {
      people = await this.rooms.listPeople(room);
    } catch (err) {
      this.logger.warn(`Could not look up who is in ${room}: ${err}`);
      return delivered;
    }

    for (const award of awards) {
      const identities = people
        .filter((c) => c.userId === award.studentUserId)
        .map((c) => c.identity);
      try {
        const sent = await this.rooms.sendServerEvent(room, identities, {
          type: 'badge-awarded',
          awardId: award.id,
          badgeId: badge.id,
          name: badge.name,
          emoji: badge.emoji,
        });
        if (sent > 0) delivered.add(award.id);
      } catch (err) {
        this.logger.warn(
          `Could not show badge ${award.id} to ${award.studentUserId}: ${err}`,
        );
      }
    }
    return delivered;
  }

  // ─── Undo ───────────────────────────────────────────────────────────────────

  /** Revokes every award made by this action (a requestId) — only by the
   * teacher who made it, in the same classroom, within BADGE_UNDO_WINDOW_MS.
   * Repeating it is harmless. */
  async undo(teacherUserId: string, room: string, requestId: string) {
    await this.studentsOfClass(teacherUserId, room); // is this the class's teacher?

    const awards = await this.prisma.classroomBadgeAward.findMany({
      where: { requestId, room, awardedByUserId: teacherUserId },
    });
    if (awards.length === 0) throw new NotFoundException('Award not found.');

    const open = awards.filter((a) => a.revokedAt === null);
    if (open.length === 0) {
      return { ok: true as const, revoked: 0, alreadyUndone: true };
    }

    const oldest = Math.min(...open.map((a) => a.createdAt.getTime()));
    if (Date.now() - oldest > BADGE_UNDO_WINDOW_MS) {
      throw new BadRequestException(
        'It is too late to undo this award — it was given more than a couple of minutes ago.',
      );
    }

    const { count } = await this.prisma.classroomBadgeAward.updateMany({
      where: {
        requestId,
        room,
        awardedByUserId: teacherUserId,
        revokedAt: null,
      },
      data: { revokedAt: new Date(), revokedByUserId: teacherUserId },
    });
    this.logger.log(
      `Badge award ${requestId} undone by ${teacherUserId} (${count} award(s))`,
    );
    return { ok: true as const, revoked: count, alreadyUndone: false };
  }

  // ─── A student's collection ────────────────────────────────────────────────

  async mine(studentUserId: string) {
    const rows = await this.prisma.classroomBadgeAward.findMany({
      where: { studentUserId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { awardedBy: { select: { fullName: true } } },
    });

    const badges = rows.map((r) => {
      const badge = describeBadge(r.badgeId);
      return {
        id: r.id,
        badgeId: r.badgeId,
        emoji: badge.emoji,
        name: badge.name,
        criteria: badge.criteria,
        awardedAt: r.createdAt.toISOString(),
        awardedBy: r.awardedBy.fullName,
      };
    });

    // The same badge can be earned again on another day: group for a summary.
    const byBadge = new Map<
      string,
      {
        badgeId: string;
        emoji: string;
        name: string;
        count: number;
        lastAwardedAt: string;
      }
    >();
    for (const b of badges) {
      const entry = byBadge.get(b.badgeId);
      if (entry) entry.count += 1;
      else
        byBadge.set(b.badgeId, {
          badgeId: b.badgeId,
          emoji: b.emoji,
          name: b.name,
          count: 1,
          lastAwardedAt: b.awardedAt, // rows are newest first
        });
    }

    return { total: badges.length, badges, summary: [...byBadge.values()] };
  }

  // ─── Who may be awarded here ───────────────────────────────────────────────

  /** The students of this classroom (userId → their name and lesson), after
   * checking that `teacherUserId` really is its teacher. Throws otherwise. */
  private async studentsOfClass(
    teacherUserId: string,
    room: string,
  ): Promise<Map<string, { name: string; lessonId: string | null }>> {
    const resolved = await this.directory.resolve(room);
    if (resolved.teacherUserId !== teacherUserId) {
      throw new ForbiddenException(
        'Only the teacher of this class can award badges in it.',
      );
    }
    if (resolved.kind === 'booking' || resolved.kind === 'trial') {
      throw new BadRequestException(
        'Badges are awarded in Lumexa curriculum classes.',
      );
    }

    const students = new Map<
      string,
      { name: string; lessonId: string | null }
    >();
    if (resolved.kind === 'demo') {
      const demo = await this.prisma.user.findUnique({
        where: { email: DEMO_STUDENT_EMAIL },
        select: { id: true, fullName: true },
      });
      if (demo) students.set(demo.id, { name: demo.fullName, lessonId: null });
      return students;
    }

    for (const lesson of resolved.lessons) {
      if (lesson.status === LessonStatus.CANCELLED) continue;
      students.set(lesson.studentUserId, {
        name: lesson.studentName,
        lessonId: lesson.id,
      });
    }
    return students;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}
