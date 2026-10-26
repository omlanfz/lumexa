// FILE PATH: server/src/batches/batches.service.ts
//
// Batch management: the batches themselves, who is in them, and the explicit
// placement flow (enroll / move / remove) that keeps every student's progress
// intact. The rules of "who may join which batch" live in batch-enrollment.ts;
// the classes a batch holds are built by BatchSessionsService.
//
// Everything that changes membership runs in ONE transaction that first locks
// the batch (and serialises the student), so two admins can never overfill a
// batch or put a student in two. A placement that cannot be made — a rule
// broken, a decision not given, the teacher double-booked — leaves everything
// exactly as it was.

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BatchStatus,
  ClassType,
  LessonStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { CLASS_DURATION_MINUTES } from '../scheduling/class-duration';
import {
  dhakaToUtc,
  todayDhakaDateStr,
  weekdayForDateStr,
} from '../scheduling/dhaka-time.util';
import {
  formatSlotTime,
  generateOccurrences,
  type WeeklySlot,
} from '../scheduling/occurrences.util';
import {
  describeDhakaMoment,
  findTeacherConflict,
} from '../scheduling/teacher-conflict.util';
import { COUNTS_AS_COMPLETED } from '../scheduling/lesson-state.util';
import { BatchSessionsService } from './batch-sessions.service';
import { leaveCurrentBatchInTx } from './batch-membership.util';
import {
  evaluateEnrollment,
  unmetDecisions,
  type EnrollmentBatchInfo,
  type EnrollmentDecisions,
  type EnrollmentEvaluation,
  type EnrollmentStudentInfo,
} from './batch-enrollment';
import {
  freezeCutoff,
  loadBatchProgress,
  lockBatch,
  lockBatches,
  lockStudentPlacement,
  studentNextLesson,
  type Db,
} from './batch-progress.util';
import { DEFAULT_BATCH_STUDENTS, MAX_BATCH_STUDENTS } from './batch.constants';
import type {
  BatchScheduleDto,
  CreateBatchDto,
  NewBatchForStudentDto,
  UpdateBatchDto,
} from './dto/batch.dto';

type SlotInput = { weekday: number; time: string };

const BATCH_LIST_INCLUDE = {
  teacher: {
    select: {
      id: true,
      user: { select: { fullName: true, avatarUrl: true } },
    },
  },
  course: { select: { id: true, title: true, sessions: true } },
  slots: { orderBy: [{ weekday: 'asc' }, { hour: 'asc' }, { minute: 'asc' }] },
  _count: { select: { members: { where: { leftAt: null } } } },
} satisfies Prisma.BatchInclude;

type BatchWithListData = Prisma.BatchGetPayload<{
  include: typeof BATCH_LIST_INCLUDE;
}>;

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly sessions: BatchSessionsService,
    private readonly ledger: StudentLedgerService,
  ) {}

  // ═══ Reading ═════════════════════════════════════════════════════════════

  /** One row per batch for the list: who teaches what, when, how full, and
   * where it is in the curriculum. */
  private async summarize(batches: BatchWithListData[]) {
    if (batches.length === 0) return [];
    const ids = batches.map((b) => b.id);
    const now = new Date();
    const [completed, nextSessions] = await Promise.all([
      this.prisma.batchSession.groupBy({
        by: ['batchId'],
        where: { batchId: { in: ids }, status: LessonStatus.COMPLETED },
        _max: { lessonNumber: true },
      }),
      this.prisma.batchSession.findMany({
        where: {
          batchId: { in: ids },
          status: LessonStatus.UPCOMING,
          end: { gt: now },
        },
        orderBy: { start: 'asc' },
        distinct: ['batchId'],
        select: {
          id: true,
          batchId: true,
          start: true,
          end: true,
          lessonNumber: true,
        },
      }),
    ]);
    const completedBy = new Map(
      completed.map((c) => [c.batchId, c._max.lessonNumber ?? null]),
    );
    const nextBy = new Map(nextSessions.map((s) => [s.batchId, s]));

    return batches.map((b) => {
      const completedThrough = completedBy.get(b.id) ?? null;
      const next = nextBy.get(b.id) ?? null;
      return {
        id: b.id,
        name: b.name,
        notes: b.notes,
        status: b.status,
        teacher: {
          id: b.teacher.id,
          name: b.teacher.user.fullName,
          avatarUrl: b.teacher.user.avatarUrl,
        },
        course: {
          id: b.course.id,
          title: b.course.title,
          totalLessons: b.course.sessions,
        },
        maxStudents: b.maxStudents,
        memberCount: b._count.members,
        startDate: b.startDate,
        slots: b.slots.map((s) => ({
          weekday: s.weekday,
          hour: s.hour,
          minute: s.minute,
        })),
        progress: {
          completedThrough,
          nextLesson: next
            ? next.lessonNumber
            : completedThrough != null
              ? completedThrough + 1
              : b.startLessonNumber,
          totalLessons: b.course.sessions,
        },
        nextSession: next
          ? {
              id: next.id,
              start: next.start,
              end: next.end,
              lessonNumber: next.lessonNumber,
            }
          : null,
        createdAt: b.createdAt,
      };
    });
  }

  async listBatches(
    filters: {
      status?: string;
      teacherId?: string;
      courseId?: string;
      search?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.BatchWhereInput = {};
    if (filters.status === 'ALL') {
      // every status
    } else if (
      filters.status &&
      (Object.values(BatchStatus) as string[]).includes(filters.status)
    ) {
      where.status = filters.status as BatchStatus;
    } else {
      // Archived batches are history; keep them out of the everyday list.
      where.status = { not: BatchStatus.ARCHIVED };
    }
    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.search?.trim()) {
      where.OR = [
        { name: { contains: filters.search.trim(), mode: 'insensitive' } },
        {
          teacher: {
            user: {
              fullName: { contains: filters.search.trim(), mode: 'insensitive' },
            },
          },
        },
        {
          members: {
            some: {
              leftAt: null,
              student: {
                fullName: { contains: filters.search.trim(), mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        include: BATCH_LIST_INCLUDE,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      batches: await this.summarize(rows),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getBatchDetail(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: BATCH_LIST_INCLUDE,
    });
    if (!batch) throw new NotFoundException('Batch not found.');
    const [summary] = await this.summarize([batch]);

    const now = new Date();
    const progress = await loadBatchProgress(this.prisma, batch, now);

    const members = await this.prisma.batchMember.findMany({
      where: { batchId },
      orderBy: { joinedAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            grade: true,
            age: true,
            accountStatus: true,
          },
        },
      },
    });
    const memberIds = members.map((m) => m.studentUserId);

    const [completedRows, attendedRows, missedRows, upcoming, recent] =
      await Promise.all([
        this.prisma.scheduledLesson.findMany({
          where: {
            studentUserId: { in: memberIds },
            courseId: batch.courseId,
            status: { in: COUNTS_AS_COMPLETED },
          },
          select: { studentUserId: true, lessonNumber: true, status: true },
        }),
        this.prisma.scheduledLesson.groupBy({
          by: ['studentUserId'],
          where: {
            batchId,
            studentUserId: { in: memberIds },
            studentJoinedAt: { not: null },
          },
          _count: { _all: true },
        }),
        this.prisma.scheduledLesson.groupBy({
          by: ['studentUserId'],
          where: {
            batchId,
            studentUserId: { in: memberIds },
            status: LessonStatus.INCOMPLETE,
            studentJoinedAt: null,
          },
          _count: { _all: true },
        }),
        this.prisma.batchSession.findMany({
          where: { batchId, status: LessonStatus.UPCOMING },
          orderBy: { start: 'asc' },
          take: 16,
          include: { _count: { select: { participants: true } } },
        }),
        this.prisma.batchSession.findMany({
          where: { batchId, status: { not: LessonStatus.UPCOMING } },
          orderBy: { start: 'desc' },
          take: 10,
          include: {
            _count: { select: { participants: true } },
            participants: { select: { studentJoinedAt: true } },
          },
        }),
      ]);

    const completedBy = new Map<string, Set<number>>();
    const maxCompleted = new Map<string, number>();
    for (const r of completedRows) {
      if (!completedBy.has(r.studentUserId)) {
        completedBy.set(r.studentUserId, new Set());
      }
      completedBy.get(r.studentUserId)!.add(r.lessonNumber);
      if (r.status === LessonStatus.COMPLETED) {
        maxCompleted.set(
          r.studentUserId,
          Math.max(maxCompleted.get(r.studentUserId) ?? 0, r.lessonNumber),
        );
      }
    }
    const attendedBy = new Map(
      attendedRows.map((r) => [r.studentUserId, r._count._all]),
    );
    const missedBy = new Map(
      missedRows.map((r) => [r.studentUserId, r._count._all]),
    );

    const batchNext = progress.firstFutureLesson ?? progress.nextLesson;
    const warnings: string[] = [];
    const active = members
      .filter((m) => m.leftAt === null)
      .map((m) => {
        const memberNext = (maxCompleted.get(m.studentUserId) ?? 0) + 1;
        const sync =
          memberNext === batchNext
            ? 'ALIGNED'
            : memberNext < batchNext
              ? 'BEHIND'
              : 'AHEAD';
        if (sync !== 'ALIGNED') {
          warnings.push(
            `${m.student.fullName} is on lesson ${memberNext} but the batch is on lesson ${batchNext}.`,
          );
        }
        return {
          studentUserId: m.studentUserId,
          fullName: m.student.fullName,
          email: m.student.email,
          avatarUrl: m.student.avatarUrl,
          grade: m.student.grade,
          age: m.student.age,
          accountStatus: m.student.accountStatus,
          joinedAt: m.joinedAt,
          joinedAtLesson: m.joinedAtLesson,
          alignment: m.alignment,
          completedLessons: completedBy.get(m.studentUserId)?.size ?? 0,
          nextLesson: memberNext,
          sync,
          attended: attendedBy.get(m.studentUserId) ?? 0,
          missed: missedBy.get(m.studentUserId) ?? 0,
        };
      });

    return {
      batch: summary,
      members: active,
      formerMembers: members
        .filter((m) => m.leftAt !== null)
        .map((m) => ({
          studentUserId: m.studentUserId,
          fullName: m.student.fullName,
          joinedAt: m.joinedAt,
          leftAt: m.leftAt,
        })),
      upcomingSessions: upcoming.map((s) => ({
        id: s.id,
        lessonNumber: s.lessonNumber,
        start: s.start,
        end: s.end,
        status: s.status,
        students: s._count.participants,
      })),
      recentSessions: recent.map((s) => ({
        id: s.id,
        lessonNumber: s.lessonNumber,
        start: s.start,
        end: s.end,
        status: s.status,
        students: s._count.participants,
        attended: s.participants.filter((p) => p.studentJoinedAt).length,
      })),
      warnings,
    };
  }

  // ═══ Compatibility ═══════════════════════════════════════════════════════

  /** The batch half of the placement facts. */
  private async loadBatchInfo(
    db: Db,
    batchId: string,
    now: Date,
  ): Promise<EnrollmentBatchInfo> {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        teacher: { select: { id: true, user: { select: { fullName: true } } } },
        course: { select: { id: true, title: true, sessions: true } },
        _count: { select: { members: { where: { leftAt: null } } } },
      },
    });
    if (!batch) throw new NotFoundException('Batch not found.');

    const progress = await loadBatchProgress(db, batch, now);
    const memberCount = batch._count.members;
    // Every lesson taught and nothing left to hold: nobody can join.
    const exhausted =
      progress.nextLesson > batch.course.sessions && progress.futureSessions === 0;
    return {
      id: batch.id,
      name: batch.name,
      status:
        batch.status === BatchStatus.ACTIVE && exhausted
          ? BatchStatus.COMPLETED
          : batch.status,
      courseId: batch.courseId,
      courseTitle: batch.course.title,
      teacherId: batch.teacherId,
      teacherName: batch.teacher.user.fullName,
      maxStudents: batch.maxStudents,
      memberCount,
      nextLesson: progress.firstFutureLesson ?? progress.nextLesson,
      anchored: progress.completedThrough !== null || memberCount > 0,
    };
  }

  /** The student half, measured in the curriculum of `courseId` (the batch's). */
  private async loadStudentInfo(
    db: Db,
    studentUserId: string,
    courseId: string,
  ): Promise<EnrollmentStudentInfo> {
    const student = await db.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        fullName: true,
        role: true,
        accountStatus: true,
        assignedTeacherId: true,
        assignedTeacher: { select: { user: { select: { fullName: true } } } },
        assignedCourseId: true,
        assignedCourse: { select: { title: true } },
        batchMemberships: {
          where: { leftAt: null },
          select: { batch: { select: { id: true, name: true } } },
        },
      },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found.');
    }
    const [nextLesson, upcomingOneToOne] = await Promise.all([
      studentNextLesson(db, studentUserId, courseId),
      db.scheduledLesson.count({
        where: {
          studentUserId,
          batchSessionId: null,
          status: LessonStatus.UPCOMING,
        },
      }),
    ]);
    return {
      id: student.id,
      fullName: student.fullName,
      accountStatus: student.accountStatus,
      assignedTeacherId: student.assignedTeacherId,
      assignedTeacherName: student.assignedTeacher?.user.fullName ?? null,
      assignedCourseId: student.assignedCourseId,
      assignedCourseTitle: student.assignedCourse?.title ?? null,
      nextLesson,
      currentBatch: student.batchMemberships[0]?.batch ?? null,
      upcomingOneToOne,
    };
  }

  /** The facts the placement rules need, read inside whatever transaction the
   * caller is in so the decision is made on the same data it will act on. */
  async loadEnrollmentInputs(
    db: Db,
    batchId: string,
    studentUserId: string,
    now = new Date(),
  ): Promise<{ batch: EnrollmentBatchInfo; student: EnrollmentStudentInfo }> {
    const batch = await this.loadBatchInfo(db, batchId, now);
    const student = await this.loadStudentInfo(db, studentUserId, batch.courseId);
    return { batch, student };
  }

  async previewEnrollment(studentUserId: string, batchId: string) {
    const { batch, student } = await this.loadEnrollmentInputs(
      this.prisma,
      batchId,
      studentUserId,
    );
    const evaluation = evaluateEnrollment(batch, student);
    return { batch, student, ...evaluation };
  }

  /** Every batch a student could be placed in, most compatible first — the
   * picker on the student's Schedule tab. */
  async listOptionsForStudent(studentUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found.');
    }
    const batches = await this.prisma.batch.findMany({
      where: { status: BatchStatus.ACTIVE },
      include: BATCH_LIST_INCLUDE,
      orderBy: { name: 'asc' },
      take: 200,
    });
    const summaries = await this.summarize(batches);

    const options: Array<
      EnrollmentEvaluation & { batch: (typeof summaries)[number] }
    > = [];
    for (const summary of summaries) {
      const { batch, student: info } = await this.loadEnrollmentInputs(
        this.prisma,
        summary.id,
        studentUserId,
      );
      const evaluation = evaluateEnrollment(batch, info);
      options.push({ batch: summary, ...evaluation });
    }
    const rank = (o: (typeof options)[number]) =>
      o.compatible ? 0 : o.allowed ? 1 : 2;
    options.sort(
      (a, b) => rank(a) - rank(b) || a.batch.name.localeCompare(b.batch.name),
    );
    return { options };
  }

  /** Students that could be added to a batch, with what stands in the way. */
  async listCandidatesForBatch(batchId: string, search?: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('Batch not found.');

    const where: Prisma.UserWhereInput = {
      role: Role.STUDENT,
      batchMemberships: { none: { batchId, leftAt: null } },
    };
    if (search?.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    const students = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        accountStatus: true,
        grade: true,
      },
      orderBy: { fullName: 'asc' },
      take: 25,
    });

    const candidates: Array<
      EnrollmentEvaluation & {
        student: (typeof students)[number];
        currentBatch: { id: string; name: string } | null;
      }
    > = [];
    for (const s of students) {
      const inputs = await this.loadEnrollmentInputs(this.prisma, batchId, s.id);
      candidates.push({
        student: s,
        currentBatch: inputs.student.currentBatch,
        ...evaluateEnrollment(inputs.batch, inputs.student),
      });
    }
    return { candidates };
  }

  // ═══ Creating and editing batches ════════════════════════════════════════

  /** Slot rules that need no database: valid times, no duplicates, no two
   * meetings of one day closer than a class is long. */
  private validateSlots(slots: SlotInput[]): void {
    const seen = new Set<string>();
    for (const s of slots) {
      const key = `${s.weekday}@${s.time}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          'The same weekly time slot is listed twice.',
        );
      }
      seen.add(key);
    }
    const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const byDay = new Map<number, number[]>();
    for (const s of slots) {
      byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), minutes(s.time)]);
    }
    for (const list of byDay.values()) {
      list.sort((a, b) => a - b);
      for (let i = 1; i < list.length; i++) {
        if (list[i] - list[i - 1] < CLASS_DURATION_MINUTES.BATCH) {
          throw new BadRequestException(
            `Two slots on the same day are closer than a batch class (${CLASS_DURATION_MINUTES.BATCH} minutes).`,
          );
        }
      }
    }
  }

  /** The first class date rules, shared by creating and rescheduling. */
  private validateFirstClass(schedule: BatchScheduleDto, now = new Date()) {
    const firstWeekday = weekdayForDateStr(schedule.firstClassDate);
    if (!schedule.slots.some((s) => s.weekday === firstWeekday)) {
      throw new BadRequestException(
        'The first class date must fall on one of the selected weekly weekdays.',
      );
    }
    if (schedule.firstClassDate < todayDhakaDateStr()) {
      throw new BadRequestException(
        'The first class date cannot be in the past.',
      );
    }
    const first = schedule.slots
      .filter((s) => s.weekday === firstWeekday)
      .map((s) => dhakaToUtc(schedule.firstClassDate, Number(s.time.slice(0, 2)), Number(s.time.slice(3))))
      .sort((a, b) => a.getTime() - b.getTime());
    if (first.every((d) => d.getTime() <= freezeCutoff(now).getTime())) {
      throw new BadRequestException(
        'The first class time has already passed or is about to start. Choose a date/time in the future.',
      );
    }
  }

  /** Dry run: would the teacher be free for every class this batch would hold
   * from its first class date? Reports the first clash. */
  private async assertTeacherFree(
    db: Db,
    teacherId: string,
    schedule: BatchScheduleDto,
    startLessonNumber: number,
    courseLessons: number,
  ): Promise<void> {
    const count = Math.max(0, courseLessons - startLessonNumber + 1);
    const slots: WeeklySlot[] = schedule.slots.map((s) => ({
      weekday: s.weekday,
      time: s.time,
    }));
    const durationMs = CLASS_DURATION_MINUTES.BATCH * 60_000;
    const now = Date.now();
    const starts = generateOccurrences(
      schedule.firstClassDate,
      slots,
      count + slots.length,
    )
      .map((o) => dhakaToUtc(o.dateStr, o.hour, o.minute))
      .filter((d) => d.getTime() > now)
      .slice(0, count);
    for (const start of starts) {
      const conflict = await findTeacherConflict(
        db,
        teacherId,
        start,
        new Date(start.getTime() + durationMs),
      );
      if (conflict) {
        throw new BadRequestException(
          `The teacher is already booked on ${describeDhakaMoment(start)} (Asia/Dhaka). Choose a different day/time.`,
        );
      }
    }
  }

  private async assertNameFree(db: Db, name: string, exceptId?: string) {
    const clash = await db.batch.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        status: { not: BatchStatus.ARCHIVED },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        `A batch named "${name.trim()}" already exists. Choose a different name.`,
      );
    }
  }

  private async createBatchInTx(
    tx: Prisma.TransactionClient,
    input: {
      name: string;
      notes?: string;
      teacherId: string;
      courseId: string;
      maxStudents?: number;
      startLessonNumber: number;
      schedule: BatchScheduleDto;
    },
    adminUserId: string,
  ) {
    const [teacher, course] = await Promise.all([
      tx.teacherProfile.findUnique({
        where: { id: input.teacherId },
        select: { id: true, isSuspended: true, user: { select: { fullName: true } } },
      }),
      tx.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, title: true, sessions: true },
      }),
    ]);
    if (!teacher) throw new NotFoundException('Teacher not found.');
    if (teacher.isSuspended) {
      throw new BadRequestException('This teacher is suspended.');
    }
    if (!course) throw new NotFoundException('Curriculum not found.');
    if (input.startLessonNumber > course.sessions) {
      throw new BadRequestException(
        `${course.title} has ${course.sessions} lessons, so a batch cannot start at lesson ${input.startLessonNumber}.`,
      );
    }

    this.validateSlots(input.schedule.slots);
    this.validateFirstClass(input.schedule);
    await this.assertNameFree(tx, input.name);
    await this.assertTeacherFree(
      tx,
      input.teacherId,
      input.schedule,
      input.startLessonNumber,
      course.sessions,
    );

    const created = await tx.batch.create({
      data: {
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
        teacherId: input.teacherId,
        courseId: input.courseId,
        maxStudents: input.maxStudents ?? DEFAULT_BATCH_STUDENTS,
        startLessonNumber: input.startLessonNumber,
        startDate: input.schedule.firstClassDate,
        createdByAdminId: adminUserId,
        slots: {
          create: input.schedule.slots.map((s) => ({
            weekday: s.weekday,
            hour: Number(s.time.slice(0, 2)),
            minute: Number(s.time.slice(3, 5)),
          })),
        },
      },
    });
    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'BATCH_CREATED',
      entityType: 'Batch',
      entityId: created.id,
      afterData: {
        name: created.name,
        teacher: teacher.user.fullName,
        course: course.title,
        maxStudents: created.maxStudents,
        startLessonNumber: created.startLessonNumber,
        startDate: created.startDate,
        slots: input.schedule.slots,
      },
    });
    return created;
  }

  async createBatch(dto: CreateBatchDto, adminUserId: string) {
    const created = await this.prisma.$transaction(
      (tx) =>
        this.createBatchInTx(
          tx,
          {
            name: dto.name,
            notes: dto.notes,
            teacherId: dto.teacherId,
            courseId: dto.courseId,
            maxStudents: dto.maxStudents,
            startLessonNumber: dto.startLessonNumber ?? 1,
            schedule: dto,
          },
          adminUserId,
        ),
      { timeout: 20_000, maxWait: 10_000 },
    ).catch((err) => this.mapUniqueViolation(err));
    return this.getBatchDetail(created.id);
  }

  private mapUniqueViolation(err: unknown): never {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictException(
        'A batch with this name already exists. Choose a different name.',
      );
    }
    throw err;
  }

  async updateBatch(batchId: string, dto: UpdateBatchDto, adminUserId: string) {
    const before = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { _count: { select: { members: { where: { leftAt: null } } } } },
    });
    if (!before) throw new NotFoundException('Batch not found.');

    const data: Prisma.BatchUpdateInput = {};
    if (dto.name !== undefined && dto.name.trim() !== before.name) {
      await this.assertNameFree(this.prisma, dto.name, batchId);
      data.name = dto.name.trim();
    }
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.maxStudents !== undefined) {
      if (dto.maxStudents < before._count.members) {
        throw new BadRequestException(
          `${before.name} already has ${before._count.members} students. Remove some before lowering its size to ${dto.maxStudents}.`,
        );
      }
      data.maxStudents = dto.maxStudents;
    }
    if (dto.status !== undefined && dto.status !== before.status) {
      if (dto.status === 'ARCHIVED') {
        if (before._count.members > 0) {
          throw new BadRequestException(
            `${before.name} still has ${before._count.members} student(s). Move or remove them before archiving it.`,
          );
        }
        data.status = BatchStatus.ARCHIVED;
      } else if (before.status === BatchStatus.ARCHIVED) {
        await this.assertNameFree(this.prisma, before.name, batchId);
        data.status = BatchStatus.ACTIVE;
      } else {
        throw new BadRequestException(
          'A completed batch cannot be reopened. Create a new batch instead.',
        );
      }
    }

    await this.prisma
      .$transaction(async (tx) => {
        await lockBatch(tx, batchId);
        await tx.batch.update({ where: { id: batchId }, data });
        if (data.status === BatchStatus.ARCHIVED) {
          // Nothing is left to teach: free any class still ahead.
          await this.sessions.regenerateFutureSessions(tx, batchId);
        }
      })
      .catch((err) => this.mapUniqueViolation(err));

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'BATCH_UPDATED',
      entityType: 'Batch',
      entityId: batchId,
      beforeData: {
        name: before.name,
        notes: before.notes,
        maxStudents: before.maxStudents,
        status: before.status,
      },
      afterData: dto,
    });
    return this.getBatchDetail(batchId);
  }

  /** New weekly slots / first class date: every class that has not opened yet
   * is rebuilt. Classes under way and everything already taught stay. */
  async changeSchedule(
    batchId: string,
    dto: BatchScheduleDto,
    adminUserId: string,
  ) {
    const before = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { slots: true },
    });
    if (!before) throw new NotFoundException('Batch not found.');
    if (before.status !== BatchStatus.ACTIVE) {
      throw new BadRequestException('Only an active batch can be rescheduled.');
    }
    this.validateSlots(dto.slots);
    this.validateFirstClass(dto);

    const result = await this.prisma.$transaction(
      async (tx) => {
        await lockBatch(tx, batchId);
        await tx.batchSlot.deleteMany({ where: { batchId } });
        await tx.batchSlot.createMany({
          data: dto.slots.map((s) => ({
            batchId,
            weekday: s.weekday,
            hour: Number(s.time.slice(0, 2)),
            minute: Number(s.time.slice(3, 5)),
          })),
        });
        await tx.batch.update({
          where: { id: batchId },
          data: { startDate: dto.firstClassDate },
        });
        return this.sessions.regenerateFutureSessions(tx, batchId, {
          fromDateStr: dto.firstClassDate,
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'BATCH_SCHEDULE_CHANGED',
      entityType: 'Batch',
      entityId: batchId,
      beforeData: {
        startDate: before.startDate,
        slots: before.slots.map((s) => ({
          weekday: s.weekday,
          time: formatSlotTime(s.hour, s.minute),
        })),
      },
      afterData: {
        startDate: dto.firstClassDate,
        slots: dto.slots,
        sessionsCreated: result.sessionsCreated,
      },
    });
    await this.notifyFirstClass(batchId);
    return this.getBatchDetail(batchId);
  }

  async changeTeacher(batchId: string, teacherId: string, adminUserId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { teacher: { select: { user: { select: { fullName: true } } } } },
    });
    if (!batch) throw new NotFoundException('Batch not found.');
    if (batch.teacherId === teacherId) return this.getBatchDetail(batchId);
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: { id: true, isSuspended: true, user: { select: { fullName: true, email: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');
    if (teacher.isSuspended) {
      throw new BadRequestException('This teacher is suspended.');
    }

    const moved = await this.prisma.$transaction(
      async (tx) => {
        await lockBatch(tx, batchId);
        const count = await this.sessions.moveFutureSessionsToTeacher(
          tx,
          batchId,
          teacherId,
        );
        await tx.batch.update({ where: { id: batchId }, data: { teacherId } });
        const members = await tx.batchMember.findMany({
          where: { batchId, leftAt: null },
          select: { studentUserId: true },
        });
        await tx.user.updateMany({
          where: { id: { in: members.map((m) => m.studentUserId) } },
          data: { assignedTeacherId: teacherId },
        });
        return { count, members };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'BATCH_TEACHER_CHANGED',
      entityType: 'Batch',
      entityId: batchId,
      beforeData: { teacher: batch.teacher.user.fullName },
      afterData: { teacher: teacher.user.fullName, sessionsMoved: moved.count },
    });
    const students = await this.prisma.user.findMany({
      where: { id: { in: moved.members.map((m) => m.studentUserId) } },
      select: { fullName: true },
    });
    for (const s of students) {
      this.notifications
        .sendTeacherStudentAssignedEmail(teacher.user.email, {
          teacherName: teacher.user.fullName,
          studentName: s.fullName,
        })
        .catch(() => {});
    }
    return this.getBatchDetail(batchId);
  }

  // ═══ Placing students ════════════════════════════════════════════════════

  private blocked(evaluation: EnrollmentEvaluation): ConflictException {
    const blockers = evaluation.issues.filter((i) => i.severity === 'BLOCKER');
    return new ConflictException({
      message: blockers[0]?.message ?? 'This placement is not allowed.',
      details: { code: 'BATCH_ENROLLMENT_BLOCKED', issues: evaluation.issues },
    });
  }

  private decisionRequired(
    evaluation: EnrollmentEvaluation,
    unmet: EnrollmentEvaluation['issues'],
  ): ConflictException {
    return new ConflictException({
      message: `Confirm before continuing: ${unmet[0].message}`,
      details: { code: 'DECISION_REQUIRED', issues: evaluation.issues, unmet },
    });
  }

  /** Ends a student's placement in whatever batch they are in: their classes
   * still ahead go, everything taught stays. Returns the batch they left. */
  private leaveCurrentBatch(
    tx: Prisma.TransactionClient,
    studentUserId: string,
    now: Date,
  ): Promise<{ id: string; name: string } | null> {
    return leaveCurrentBatchInTx(tx, studentUserId, now);
  }

  /**
   * Places a student in a batch — an existing one, or a new one made here. This
   * is the one path for enrolling a student, moving them between batches, and
   * switching them from 1-to-1 to a batch. Their progress is never rewritten:
   * what changes (their teacher, lessons the batch will not retake with them,
   * the 1-to-1 classes it replaces) must have been explicitly accepted.
   *
   * One transaction, in this order: decide (refuse on a blocker or an
   * unanswered decision, changing nothing) → clear the student's old placement
   * and 1-to-1 schedule → create the batch if it is new (so its teacher check
   * does not trip over the very classes being replaced) → place the student.
   */
  async enrollStudent(params: {
    studentUserId: string;
    batchId?: string;
    newBatch?: NewBatchForStudentDto;
    decisions?: EnrollmentDecisions;
    adminUserId: string;
  }) {
    const { studentUserId, adminUserId } = params;
    if (!!params.batchId === !!params.newBatch) {
      throw new BadRequestException(
        'Choose an existing batch or create a new one.',
      );
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        assignedTeacherId: true,
        assignedCourseId: true,
        assignedCourse: { select: { id: true, title: true } },
      },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Student not found.');
    }
    if (
      params.newBatch &&
      (!student.assignedTeacherId || !student.assignedCourseId)
    ) {
      throw new BadRequestException(
        'Assign a teacher and a curriculum to this student before creating a batch for them.',
      );
    }

    const now = new Date();
    const outcome = await this.prisma
      .$transaction(
        async (tx) => {
          await lockStudentPlacement(tx, studentUserId);
          const current = await tx.batchMember.findFirst({
            where: { studentUserId, leftAt: null },
            select: { batchId: true },
          });
          await lockBatches(tx, [current?.batchId, params.batchId]);

          // ── 1. Decide ────────────────────────────────────────────────
          let evaluation: EnrollmentEvaluation;
          let inputs: { batch: EnrollmentBatchInfo; student: EnrollmentStudentInfo };
          if (params.batchId) {
            inputs = await this.loadEnrollmentInputs(
              tx,
              params.batchId,
              studentUserId,
              now,
            );
          } else {
            // A batch that does not exist yet: it will be the student's own
            // teacher and curriculum, empty, starting at the student's lesson.
            const studentInfo = await this.loadStudentInfo(
              tx,
              studentUserId,
              student.assignedCourseId!,
            );
            const teacher = await tx.teacherProfile.findUniqueOrThrow({
              where: { id: student.assignedTeacherId! },
              select: { user: { select: { fullName: true } } },
            });
            inputs = {
              student: studentInfo,
              batch: {
                id: 'new',
                name: params.newBatch!.name,
                status: BatchStatus.ACTIVE,
                courseId: student.assignedCourseId!,
                courseTitle: student.assignedCourse!.title,
                teacherId: student.assignedTeacherId!,
                teacherName: teacher.user.fullName,
                maxStudents: params.newBatch!.maxStudents ?? DEFAULT_BATCH_STUDENTS,
                memberCount: 0,
                nextLesson: studentInfo.nextLesson,
                anchored: false,
              },
            };
          }
          evaluation = evaluateEnrollment(inputs.batch, inputs.student);
          if (!evaluation.allowed) throw this.blocked(evaluation);
          const unmet = unmetDecisions(evaluation.issues, params.decisions);
          if (unmet.length > 0) throw this.decisionRequired(evaluation, unmet);

          // ── 2. Clear the student's old placement ─────────────────────
          const previousBatch = await this.leaveCurrentBatch(tx, studentUserId, now);
          const replaced = await tx.scheduledLesson.deleteMany({
            where: {
              studentUserId,
              batchSessionId: null,
              status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
            },
          });
          await tx.recurringSlot.deleteMany({ where: { studentUserId } });

          // ── 3. The batch (made now when it is new) ───────────────────
          let batchId = params.batchId;
          if (!batchId) {
            const created = await this.createBatchInTx(
              tx,
              {
                name: params.newBatch!.name,
                notes: params.newBatch!.notes,
                teacherId: student.assignedTeacherId!,
                courseId: student.assignedCourseId!,
                maxStudents: params.newBatch!.maxStudents,
                startLessonNumber: inputs.student.nextLesson,
                schedule: params.newBatch!,
              },
              adminUserId,
            );
            batchId = created.id;
            await lockBatch(tx, batchId);
          }
          const batch = await tx.batch.findUniqueOrThrow({
            where: { id: batchId },
            include: {
              teacher: {
                select: { user: { select: { fullName: true, email: true } } },
              },
              course: {
                select: { id: true, title: true, priceCents: true, sessions: true },
              },
            },
          });

          // ── 4. Place the student ─────────────────────────────────────
          await tx.user.update({
            where: { id: studentUserId },
            data: {
              assignedTeacherId: batch.teacherId,
              assignedCourseId: batch.courseId,
              assignedClassType: ClassType.BATCH,
            },
          });
          // A batch that has taught nothing starts where the student is.
          if (evaluation.alignment === 'BATCH_REBASED') {
            await tx.batch.update({
              where: { id: batchId },
              data: { startLessonNumber: evaluation.studentNextLesson },
            });
          }
          const startsAt =
            evaluation.alignment === 'BATCH_REBASED'
              ? evaluation.studentNextLesson
              : evaluation.batchNextLesson;
          await tx.batchMember.create({
            data: {
              batchId,
              studentUserId,
              alignment: evaluation.alignment,
              joinedAtLesson: startsAt,
              addedByAdminId: adminUserId,
            },
          });
          const hasFuture =
            (await tx.batchSession.count({
              where: { batchId, status: LessonStatus.UPCOMING, start: { gt: now } },
            })) > 0;
          let leftOut: number[];
          if (evaluation.alignment === 'BATCH_REBASED' || !hasFuture) {
            const regenerated = await this.sessions.regenerateFutureSessions(
              tx,
              batchId,
              { now },
            );
            leftOut = regenerated.skipped.map((s) => s.lessonNumber);
          } else {
            leftOut = (
              await this.sessions.attachMember(tx, batchId, studentUserId, now)
            ).skipped;
          }

          // ── 5. The record ────────────────────────────────────────────
          await this.audit.log({
            actorId: adminUserId,
            actorRole: 'ADMIN',
            action: previousBatch ? 'STUDENT_BATCH_MOVED' : 'STUDENT_BATCH_JOINED',
            entityType: 'User',
            entityId: studentUserId,
            beforeData: {
              classType: previousBatch
                ? 'BATCH'
                : inputs.student.upcomingOneToOne > 0
                  ? 'ONE_TO_ONE'
                  : null,
              batch: previousBatch?.name ?? null,
              teacher: inputs.student.assignedTeacherName,
            },
            afterData: {
              classType: 'BATCH',
              batch: batch.name,
              teacher: batch.teacher.user.fullName,
              alignment: evaluation.alignment,
              startsAtLesson: startsAt,
              lessonsNotTaken:
                evaluation.alignment === 'SKIPPED_TO_BATCH'
                  ? [evaluation.studentNextLesson, evaluation.batchNextLesson - 1]
                  : null,
              upcomingOneToOneRemoved: replaced.count,
              alreadyCompletedLessonsLeftOut: leftOut,
            },
          });
          await this.audit.log({
            actorId: adminUserId,
            actorRole: 'ADMIN',
            action: 'BATCH_STUDENT_ADDED',
            entityType: 'Batch',
            entityId: batchId,
            afterData: {
              student: student.fullName,
              alignment: evaluation.alignment,
              startsAtLesson: startsAt,
              from: previousBatch?.name ?? null,
            },
          });
          if (previousBatch) {
            await this.audit.log({
              actorId: adminUserId,
              actorRole: 'ADMIN',
              action: 'BATCH_STUDENT_REMOVED',
              entityType: 'Batch',
              entityId: previousBatch.id,
              afterData: { student: student.fullName, movedTo: batch.name },
            });
          }

          return {
            batch,
            previousBatch,
            alignment: evaluation.alignment,
            startsAtLesson: startsAt,
            teacherChanged: student.assignedTeacherId !== batch.teacherId,
          };
        },
        { timeout: 30_000, maxWait: 10_000 },
      )
      .catch((err) => this.mapUniqueViolation(err));

    // After the commit: billing context and the emails (best effort).
    if (student.assignedCourseId !== outcome.batch.courseId) {
      await this.ledger
        .recordCurriculumChange(
          studentUserId,
          adminUserId,
          student.assignedCourse,
          outcome.batch.course,
        )
        .catch((err) =>
          this.logger.error(`Ledger curriculum change failed: ${err}`),
        );
    }
    const first = await this.prisma.scheduledLesson.findFirst({
      where: { studentUserId, status: LessonStatus.UPCOMING },
      orderBy: { start: 'asc' },
      select: { start: true, end: true },
    });
    if (first) {
      this.notifications
        .sendClassBookedEmail(student.email, {
          studentName: student.fullName,
          teacherName: outcome.batch.teacher.user.fullName,
          classStart: first.start,
          classEnd: first.end,
          classUrl: `${process.env.FRONTEND_URL}/dashboard`,
        })
        .catch(() => {});
    }
    if (outcome.teacherChanged || !student.assignedTeacherId) {
      this.notifications
        .sendTeacherStudentAssignedEmail(outcome.batch.teacher.user.email, {
          teacherName: outcome.batch.teacher.user.fullName,
          studentName: student.fullName,
        })
        .catch(() => {});
    }

    return {
      batchId: outcome.batch.id,
      batchName: outcome.batch.name,
      movedFrom: outcome.previousBatch?.name ?? null,
      alignment: outcome.alignment,
      startsAtLesson: outcome.startsAtLesson,
    };
  }

  /** Takes a student out of their batch. Their classes still ahead in it are
   * removed; everything already taught stays on their record. They remain a
   * "Batch" student until placed in another batch (or switched to 1-to-1). */
  async removeStudent(
    studentUserId: string,
    adminUserId: string,
    onlyFromBatchId?: string,
  ) {
    const now = new Date();
    const left = await this.prisma.$transaction(
      async (tx) => {
        await lockStudentPlacement(tx, studentUserId);
        const membership = await tx.batchMember.findFirst({
          where: { studentUserId, leftAt: null },
        });
        if (!membership || (onlyFromBatchId && membership.batchId !== onlyFromBatchId)) {
          throw new BadRequestException('This student is not in that batch.');
        }
        return this.leaveCurrentBatch(tx, studentUserId, now);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
    if (!left) throw new BadRequestException('This student is not in a batch.');

    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { fullName: true },
    });
    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_BATCH_LEFT',
      entityType: 'User',
      entityId: studentUserId,
      afterData: { batch: left.name },
    });
    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'BATCH_STUDENT_REMOVED',
      entityType: 'Batch',
      entityId: left.id,
      afterData: { student: student?.fullName },
    });
    return { success: true, batchId: left.id, batchName: left.name };
  }

  // ═══ Pause / resume / curriculum changes ═════════════════════════════════

  /** A paused student does not attend: their classes still ahead are removed
   * (their placement is kept, so they come back to the same batch). */
  async suspendParticipation(studentUserId: string) {
    const membership = await this.prisma.batchMember.findFirst({
      where: { studentUserId, leftAt: null },
    });
    if (!membership) return { suspended: false };
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await lockBatch(tx, membership.batchId);
      await this.sessions.detachFutureParticipation(
        tx,
        studentUserId,
        membership.batchId,
        now,
      );
    });
    return { suspended: true, batchId: membership.batchId };
  }

  /** The student is active again: they rejoin the classes their batch has
   * ahead of it. The batch kept going while they were paused, so they pick up
   * at the batch's current lesson — the lessons held in between stay untaken
   * and are reported back, never silently counted. */
  async resumeParticipation(studentUserId: string, adminUserId: string) {
    const membership = await this.prisma.batchMember.findFirst({
      where: { studentUserId, leftAt: null },
      include: { batch: true },
    });
    if (!membership) return { rejoined: false as const, reason: 'NO_BATCH' };

    const now = new Date();
    if (membership.batch.status !== BatchStatus.ACTIVE) {
      await this.prisma.batchMember.update({
        where: { id: membership.id },
        data: { leftAt: now },
      });
      return {
        rejoined: false as const,
        reason: 'BATCH_CLOSED',
        batchName: membership.batch.name,
      };
    }

    try {
      const outcome = await this.prisma.$transaction(
        async (tx) => {
          await lockBatch(tx, membership.batchId);
          const inputs = await this.loadEnrollmentInputs(
            tx,
            membership.batchId,
            studentUserId,
            now,
          );
          const hasFuture =
            (await tx.batchSession.count({
              where: {
                batchId: membership.batchId,
                status: LessonStatus.UPCOMING,
                start: { gt: now },
              },
            })) > 0;
          if (hasFuture) {
            await this.sessions.attachMember(tx, membership.batchId, studentUserId, now);
          } else {
            await this.sessions.regenerateFutureSessions(tx, membership.batchId, { now });
          }
          return inputs;
        },
        { timeout: 30_000, maxWait: 10_000 },
      );
      const s = outcome.student.nextLesson;
      const b = outcome.batch.nextLesson;
      await this.audit.log({
        actorId: adminUserId,
        actorRole: 'ADMIN',
        action: 'STUDENT_BATCH_RESUMED',
        entityType: 'User',
        entityId: studentUserId,
        afterData: {
          batch: membership.batch.name,
          rejoinedAtLesson: b,
          lessonsMissedWhilePaused: s < b ? [s, b - 1] : null,
        },
      });
      return {
        rejoined: true as const,
        batchName: membership.batch.name,
        atLesson: b,
        missedLessons: s < b ? { from: s, to: b - 1 } : null,
      };
    } catch (err) {
      this.logger.warn(
        `Could not put student ${studentUserId} back in batch ${membership.batchId}: ${err}`,
      );
      return {
        rejoined: false as const,
        reason: 'NOT_RESTORED',
        batchName: membership.batch.name,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** A curriculum was edited (lessons added, removed or reordered): every active
   * batch on it rebuilds the classes still ahead from where it is, the same
   * way each 1-to-1 schedule does. A batch that cannot (a teacher clash) is
   * left as it was and reported. */
  async reconcileCourseBatches(courseId: string) {
    const batches = await this.prisma.batch.findMany({
      where: { courseId, status: BatchStatus.ACTIVE },
      select: { id: true, name: true },
    });
    let reconciled = 0;
    let skipped = 0;
    for (const b of batches) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            await lockBatch(tx, b.id);
            await this.sessions.regenerateFutureSessions(tx, b.id);
          },
          { timeout: 30_000, maxWait: 10_000 },
        );
        reconciled++;
      } catch (err) {
        skipped++;
        this.logger.warn(
          `Skipped reconciling batch "${b.name}" after a curriculum change: ${err}. It needs a manual reschedule.`,
        );
      }
    }
    return { reconciled, skipped };
  }

  // ═══ Small reads used around the app ═════════════════════════════════════

  /** The first upcoming class of the batch the student is in, as an email. */
  private async notifyFirstClass(batchId: string) {
    const session = await this.prisma.batchSession.findFirst({
      where: { batchId, status: LessonStatus.UPCOMING, start: { gt: new Date() } },
      orderBy: { start: 'asc' },
      include: {
        teacher: { select: { user: { select: { fullName: true } } } },
        participants: {
          select: { student: { select: { email: true, fullName: true } } },
        },
      },
    });
    if (!session) return;
    for (const p of session.participants) {
      this.notifications
        .sendClassBookedEmail(p.student.email, {
          studentName: p.student.fullName,
          teacherName: session.teacher.user.fullName,
          classStart: session.start,
          classEnd: session.end,
          classUrl: `${process.env.FRONTEND_URL}/dashboard`,
        })
        .catch(() => {});
    }
  }

  /** Which batch a student is in right now (null when none). */
  async getStudentPlacement(studentUserId: string) {
    const membership = await this.prisma.batchMember.findFirst({
      where: { studentUserId, leftAt: null },
      include: { batch: { include: BATCH_LIST_INCLUDE } },
    });
    if (!membership) return null;
    const [summary] = await this.summarize([membership.batch]);
    return {
      ...summary,
      joinedAt: membership.joinedAt,
      joinedAtLesson: membership.joinedAtLesson,
      alignment: membership.alignment,
    };
  }
}
