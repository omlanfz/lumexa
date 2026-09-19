// FILE PATH: server/src/assessments/assessments.service.ts
//
// The native assessment engine (requirement #7): MCQ auto-grading,
// practical coding submissions (deterministic test cases + AI-assisted
// feedback, never one bypassing the other where both are possible), and
// teacher-recorded viva for the Final Test's Part C.

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, Role, SessionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { todayDhakaDateStr, utcToDhakaParts } from '../scheduling/dhaka-time.util';
import { AiGradingService } from './ai-grading.service';
import { CodeRunnerService } from './code-runner.service';
import { CertificatesService } from '../certificates/certificates.service';
import { RecordVivaDto, SubmitMCQAnswerDto, SubmitPracticalDto } from './dto/assessment.dto';

interface Requester {
  userId: string;
  role: Role;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGrading: AiGradingService,
    private readonly codeRunner: CodeRunnerService,
    private readonly certificates: CertificatesService,
  ) {}

  // ── Start / resume an attempt ─────────────────────────────────────────────

  async startAttempt(assessmentId: string, studentUserId: string, scheduledLessonId?: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        mcqQuestions: { where: { isPublished: true } },
        practicalQuestions: { where: { isPublished: true }, orderBy: { order: 'asc' } },
        lesson: { select: { courseId: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (!assessment.isPublished) throw new ForbiddenException('This assessment is not yet published.');

    let sl: { id: string; studentUserId: string; status: string; start: Date } | null = null;
    if (scheduledLessonId) {
      sl = await this.prisma.scheduledLesson.findUnique({ where: { id: scheduledLessonId } });
      if (!sl || sl.studentUserId !== studentUserId) throw new ForbiddenException('This is not your class.');
      const isToday = utcToDhakaParts(sl.start).dateStr === todayDhakaDateStr();
      if (sl.status === 'UPCOMING' && !isToday) {
        throw new ForbiddenException('This test is not available yet — it unlocks on the scheduled test day.');
      }
    }

    const existing = scheduledLessonId
      ? await this.prisma.assessmentAttempt.findUnique({ where: { scheduledLessonId } })
      : await this.prisma.assessmentAttempt.findFirst({ where: { assessmentId, studentUserId }, orderBy: { createdAt: 'desc' } });

    if (existing) return this.getAttempt(existing.id, { userId: studentUserId, role: Role.STUDENT });

    const pool = assessment.mcqQuestions;
    const drawCount = Math.min(assessment.mcqCount || pool.length, pool.length);
    const chosen = assessment.randomizeQuestions ? shuffle(pool).slice(0, drawCount) : pool.slice(0, drawCount);

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        studentUserId,
        scheduledLessonId: scheduledLessonId ?? undefined,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        mcqQuestionIds: chosen.map((q) => q.id),
        mcqMaxScore: chosen.length,
        practicalMaxScore: assessment.practicalQuestions.reduce((s, q) => s + q.maxScore, 0),
        vivaMaxScore: assessment.type === SessionType.FINAL_TEST ? assessment.vivaMaxScore : null,
      },
    });

    // Pin each question's displayed option order up front so a page reload
    // shows the exact same shuffle, and so we can translate a later
    // "selected displayed index" back to the real option index.
    await this.prisma.mCQAnswer.createMany({
      data: chosen.map((q) => {
        const options = (q.options as unknown as string[]).map((_, i) => i);
        const optionOrder = assessment.randomizeOptions ? shuffle(options) : options;
        return { attemptId: attempt.id, questionId: q.id, optionOrder };
      }),
    });

    return this.getAttempt(attempt.id, { userId: studentUserId, role: Role.STUDENT });
  }

  // ── Read an attempt (student-owned, or teacher/admin reviewing) ──────────

  async getAttempt(attemptId: string, requester: Requester) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: { practicalQuestions: { orderBy: { order: 'asc' } }, lesson: { select: { courseId: true, title: true } } },
        },
        mcqAnswers: { include: { question: true } },
        practicalSubmissions: true,
        vivaRecord: true,
        student: { select: { id: true, fullName: true } },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    await this.assertCanView(attempt, requester);

    const revealAnswers = attempt.status === AttemptStatus.GRADED || requester.role !== Role.STUDENT;

    const mcq = attempt.mcqAnswers.map((a) => {
      const order = a.optionOrder.length ? a.optionOrder : (a.question.options as unknown as string[]).map((_, i) => i);
      const displayedOptions = order.map((origIdx) => (a.question.options as unknown as string[])[origIdx]);
      const displayedSelectedIndex = a.selectedIndex !== null ? order.indexOf(a.selectedIndex) : null;
      return {
        id: a.questionId,
        questionText: a.question.questionText,
        options: displayedOptions,
        selectedIndex: displayedSelectedIndex,
        answered: a.selectedIndex !== null,
        ...(revealAnswers
          ? { correctIndex: order.indexOf(a.question.correctIndex), isCorrect: a.isCorrect, explanation: a.question.explanation }
          : {}),
      };
    });

    const practical = attempt.assessment.practicalQuestions.map((q) => {
      const submission = attempt.practicalSubmissions.find((s) => s.questionId === q.id);
      return {
        id: q.id,
        title: q.title,
        instructions: q.instructions,
        language: q.language,
        starterCode: q.starterCode,
        maxScore: q.maxScore,
        submitted: !!submission,
        code: submission?.code ?? q.starterCode ?? '',
        deterministicResult: submission?.deterministicResult ?? null,
        aiEvaluation: revealAnswers ? submission?.aiEvaluation ?? null : submission?.aiEvaluation ? { available: true, pending: true } : null,
        score: submission?.score ?? null,
      };
    });

    return {
      id: attempt.id,
      status: attempt.status,
      assessment: {
        id: attempt.assessment.id,
        type: attempt.assessment.type,
        title: attempt.assessment.title,
        instructions: attempt.assessment.instructions,
        courseId: attempt.assessment.lesson.courseId,
        hasViva: attempt.assessment.type === SessionType.FINAL_TEST,
      },
      student: attempt.student,
      mcq,
      practical,
      viva: attempt.vivaRecord,
      scores: {
        mcqScore: attempt.mcqScore,
        mcqMaxScore: attempt.mcqMaxScore,
        practicalScore: attempt.practicalScore,
        practicalMaxScore: attempt.practicalMaxScore,
        vivaScore: attempt.vivaScore,
        vivaMaxScore: attempt.vivaMaxScore,
        totalScore: attempt.totalScore,
        totalMaxScore: attempt.totalMaxScore,
        passed: attempt.passed,
      },
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
    };
  }

  // NOTE on PARENT access: the schema has no ownership link between a
  // self-auth STUDENT account and a PARENT account (the legacy `Student`
  // sub-entity's `parentId` is a different id space entirely — see
  // "student-first architecture" in the Prisma schema history) — so there
  // is currently no way to verify a parent legitimately owns a given
  // student here. Rather than either wrongly grant or wrongly deny every
  // parent, PARENT is refused at this granular per-attempt endpoint until
  // that relation exists; parents/admins/teachers see results today via
  // listAttemptsForStudent/listAttemptsForCourse under the same rule.
  private async assertCanView(
    attempt: { studentUserId: string; assessment: { lesson: { courseId: string } } },
    requester: Requester,
  ) {
    if (requester.role === Role.ADMIN) return;
    if (requester.userId === attempt.studentUserId) return;
    if (requester.role === Role.TEACHER) {
      const teaches = await this.prisma.scheduledLesson.findFirst({
        where: { courseId: attempt.assessment.lesson.courseId, teacher: { userId: requester.userId } },
        select: { id: true },
      });
      if (teaches) return;
    }
    throw new ForbiddenException('You do not have access to this assessment attempt.');
  }

  // ── MCQ answering ──────────────────────────────────────────────────────────

  async submitMCQAnswer(attemptId: string, dto: SubmitMCQAnswerDto, studentUserId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentUserId !== studentUserId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('This attempt is no longer editable.');

    const answer = await this.prisma.mCQAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      include: { question: true },
    });
    if (!answer) throw new NotFoundException('Question not part of this attempt');

    const order = answer.optionOrder.length ? answer.optionOrder : (answer.question.options as unknown as string[]).map((_, i) => i);
    const realIndex = dto.selectedIndex !== undefined ? order[dto.selectedIndex] : null;
    const isCorrect = realIndex !== null && realIndex === answer.question.correctIndex;

    await this.prisma.mCQAnswer.update({
      where: { id: answer.id },
      data: { selectedIndex: realIndex, isCorrect, answeredAt: new Date() },
    });
    return { success: true };
  }

  // ── Practical submission ────────────────────────────────────────────────

  async submitPractical(attemptId: string, dto: SubmitPracticalDto, studentUserId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentUserId !== studentUserId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('This attempt is no longer editable.');

    const question = await this.prisma.practicalQuestion.findUnique({ where: { id: dto.questionId } });
    if (!question || question.assessmentId !== attempt.assessmentId) throw new NotFoundException('Question not found');

    const testCases = (question.testCases as unknown as { name: string; input: unknown[]; expectedOutput: unknown }[]) || [];
    const deterministic = this.codeRunner.run(question.language, dto.code, testCases, question.starterCode);

    const ai = await this.aiGrading.evaluate({
      questionTitle: question.title,
      instructions: question.instructions,
      language: question.language,
      studentCode: dto.code,
      deterministicSummary: deterministic ? `${deterministic.passedCount}/${deterministic.total} automated test cases passed.` : undefined,
    });

    // Deterministic result is authoritative when it exists — AI feedback is
    // advisory context alongside it, never overriding the pass/fail math.
    let score: number | null;
    if (deterministic) {
      score = Math.round((deterministic.passedCount / Math.max(1, deterministic.total)) * question.maxScore);
    } else if (ai.available && ai.score !== null) {
      score = Math.round((ai.score / 100) * question.maxScore);
    } else {
      score = null; // no deterministic runner + AI unavailable — needs teacher/admin manual grading
    }

    const submission = await this.prisma.practicalSubmission.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      update: {
        code: dto.code,
        deterministicResult: (deterministic as unknown as object) ?? undefined,
        aiEvaluation: ai as unknown as object,
        aiEvaluatedAt: new Date(),
        score: score ?? undefined,
      },
      create: {
        attemptId,
        questionId: dto.questionId,
        code: dto.code,
        deterministicResult: (deterministic as unknown as object) ?? undefined,
        aiEvaluation: ai as unknown as object,
        aiEvaluatedAt: new Date(),
        score: score ?? undefined,
      },
    });

    return { deterministicResult: deterministic, aiEvaluation: ai, score: submission.score };
  }

  // ── Finalize (Part A + B) ───────────────────────────────────────────────

  async submitAttempt(attemptId: string, studentUserId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: { include: { practicalQuestions: true } },
        mcqAnswers: true,
        practicalSubmissions: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentUserId !== studentUserId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException('This attempt has already been submitted.');

    const mcqScore = attempt.mcqAnswers.filter((a) => a.isCorrect).length;
    const mcqMaxScore = attempt.mcqAnswers.length;

    const gradedPractical = attempt.practicalSubmissions.filter((s) => s.score !== null);
    const practicalScore = gradedPractical.reduce((s, r) => s + (r.score ?? 0), 0);
    const practicalMaxScore = attempt.assessment.practicalQuestions
      .filter((q) => attempt.practicalSubmissions.some((s) => s.questionId === q.id))
      .reduce((s, q) => s + q.maxScore, 0);
    const pendingManualReview = attempt.practicalSubmissions.some((s) => s.score === null);

    const isFinal = attempt.assessment.type === SessionType.FINAL_TEST;
    const { totalScore, totalMaxScore } = this.computeTotals({
      mcqScore,
      mcqMaxScore,
      practicalScore,
      practicalMaxScore,
      vivaScore: null,
      vivaMaxScore: isFinal ? attempt.vivaMaxScore : null,
    });

    const status = isFinal || pendingManualReview ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;

    const updated = await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        gradedAt: status === AttemptStatus.GRADED ? new Date() : undefined,
        mcqScore,
        mcqMaxScore,
        practicalScore,
        practicalMaxScore,
        totalScore: status === AttemptStatus.GRADED ? totalScore : undefined,
        totalMaxScore: status === AttemptStatus.GRADED ? totalMaxScore : undefined,
        passed: status === AttemptStatus.GRADED ? totalScore >= (await this.passThreshold(attempt.assessmentId)) : undefined,
      },
    });
    return updated;
  }

  private async passThreshold(assessmentId: string) {
    const a = await this.prisma.assessment.findUnique({ where: { id: assessmentId }, select: { passScorePct: true } });
    return a?.passScorePct ?? 60;
  }

  private computeTotals(parts: {
    mcqScore: number;
    mcqMaxScore: number;
    practicalScore: number;
    practicalMaxScore: number;
    vivaScore: number | null;
    vivaMaxScore: number | null;
  }) {
    const components: { pct: number; weight: number }[] = [];
    if (parts.mcqMaxScore > 0) components.push({ pct: (parts.mcqScore / parts.mcqMaxScore) * 100, weight: 1 });
    if (parts.practicalMaxScore > 0) components.push({ pct: (parts.practicalScore / parts.practicalMaxScore) * 100, weight: 1 });
    if (parts.vivaMaxScore) {
      if (parts.vivaScore !== null) components.push({ pct: (parts.vivaScore / parts.vivaMaxScore) * 100, weight: 1 });
    }
    if (components.length === 0) return { totalScore: 0, totalMaxScore: 100 };
    const totalScore = components.reduce((s, c) => s + c.pct * c.weight, 0) / components.reduce((s, c) => s + c.weight, 0);
    return { totalScore: Math.round(totalScore * 10) / 10, totalMaxScore: 100 };
  }

  // ── Viva (Final Test Part C — teacher-recorded) ───────────────────────────

  async recordViva(attemptId: string, dto: RecordVivaDto, requester: Requester) {
    if (requester.role !== Role.TEACHER && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Only a teacher or admin can record a viva.');
    }
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: { include: { lesson: { select: { courseId: true } } } } },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.assessment.type !== SessionType.FINAL_TEST) {
      throw new BadRequestException('Only a Final Test attempt has a viva component.');
    }
    if (attempt.status === AttemptStatus.IN_PROGRESS || attempt.status === AttemptStatus.NOT_STARTED) {
      throw new BadRequestException('The student must submit Parts A and B before recording a viva.');
    }

    let teacherProfileId: string | null = null;
    if (requester.role === Role.TEACHER) {
      const tp = await this.prisma.teacherProfile.findUnique({ where: { userId: requester.userId }, select: { id: true } });
      if (!tp) throw new ForbiddenException('No teacher profile found.');
      teacherProfileId = tp.id;
    } else {
      // Admin recording on behalf of a teacher — attribute to the course's
      // assigned teacher if one can be resolved, else refuse (a viva must
      // have a real recorder).
      const assigned = await this.prisma.scheduledLesson.findFirst({
        where: { courseId: attempt.assessment.lesson.courseId, studentUserId: attempt.studentUserId },
        select: { teacherId: true },
        orderBy: { start: 'desc' },
      });
      if (!assigned) throw new BadRequestException('No assigned teacher found to attribute this viva to.');
      teacherProfileId = assigned.teacherId;
    }

    const viva = await this.prisma.vivaRecord.upsert({
      where: { attemptId },
      update: { questions: dto.questions as unknown as object, score: dto.score, remarks: dto.remarks, recordedByTeacherId: teacherProfileId },
      create: {
        attemptId,
        recordedByTeacherId: teacherProfileId,
        questions: dto.questions as unknown as object,
        score: dto.score,
        maxScore: attempt.vivaMaxScore ?? 20,
        remarks: dto.remarks,
      },
    });

    const { totalScore, totalMaxScore } = this.computeTotals({
      mcqScore: attempt.mcqScore ?? 0,
      mcqMaxScore: attempt.mcqMaxScore ?? 0,
      practicalScore: attempt.practicalScore ?? 0,
      practicalMaxScore: attempt.practicalMaxScore ?? 0,
      vivaScore: dto.score ?? null,
      vivaMaxScore: attempt.vivaMaxScore,
    });
    const passScorePct = await this.passThreshold(attempt.assessmentId);
    const passed = totalScore >= passScorePct;

    await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        vivaScore: dto.score,
        totalScore,
        totalMaxScore,
        passed,
        status: AttemptStatus.GRADED,
        gradedAt: new Date(),
      },
    });

    // A Final Test is only ever graded here (see the doc comment atop this
    // method) — so this is the single point in the app that can detect
    // "curriculum completed" and issue a certificate. Fire-and-forget: a
    // slow PDF render/upload must never block recording a viva score.
    if (passed) {
      this.certificates
        .checkAndIssueCertificate(attempt.studentUserId, attempt.assessment.lesson.courseId)
        .catch(() => {});
    }

    return viva;
  }

  // ── Results listing (teacher/parent/admin/self) ───────────────────────────

  async listAttemptsForStudent(studentUserId: string, requester: Requester) {
    if (requester.role === Role.ADMIN) {
      // allowed
    } else if (requester.userId === studentUserId) {
      // a student viewing their own results
    } else if (requester.role === Role.TEACHER) {
      const assigned = await this.prisma.user.findFirst({
        where: { id: studentUserId, assignedTeacher: { userId: requester.userId } },
        select: { id: true },
      });
      if (!assigned) throw new ForbiddenException('You are not this student\'s assigned teacher.');
    } else {
      // PARENT (and any other role) — see the note on assertCanView above;
      // no reliable ownership link exists yet for self-auth student accounts.
      throw new ForbiddenException();
    }
    return this.prisma.assessmentAttempt.findMany({
      where: { studentUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        assessment: { select: { title: true, type: true, lesson: { select: { title: true, course: { select: { title: true } } } } } },
      },
    });
  }

  // ── Admin: question bank + assessment settings management ────────────────

  async getAssessmentAdmin(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        mcqQuestions: { orderBy: { order: 'asc' } },
        practicalQuestions: { orderBy: { order: 'asc' } },
        lesson: { select: { title: true, courseId: true, course: { select: { title: true } } } },
        _count: { select: { attempts: true } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async updateAssessmentSettings(assessmentId: string, dto: Record<string, unknown>) {
    const a = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!a) throw new NotFoundException('Assessment not found');
    return this.prisma.assessment.update({ where: { id: assessmentId }, data: dto });
  }

  async createMCQQuestion(assessmentId: string, dto: Record<string, unknown>) {
    const a = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!a) throw new NotFoundException('Assessment not found');
    return this.prisma.mCQQuestion.create({ data: { assessmentId, ...dto } as never });
  }

  async updateMCQQuestion(id: string, dto: Record<string, unknown>) {
    const q = await this.prisma.mCQQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    return this.prisma.mCQQuestion.update({ where: { id }, data: dto as never });
  }

  async deleteMCQQuestion(id: string) {
    const q = await this.prisma.mCQQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    await this.prisma.mCQQuestion.delete({ where: { id } });
    return { success: true };
  }

  async createPracticalQuestion(assessmentId: string, dto: Record<string, unknown>) {
    const a = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!a) throw new NotFoundException('Assessment not found');
    return this.prisma.practicalQuestion.create({ data: { assessmentId, ...dto } as never });
  }

  async updatePracticalQuestion(id: string, dto: Record<string, unknown>) {
    const q = await this.prisma.practicalQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    return this.prisma.practicalQuestion.update({ where: { id }, data: dto as never });
  }

  async deletePracticalQuestion(id: string) {
    const q = await this.prisma.practicalQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    await this.prisma.practicalQuestion.delete({ where: { id } });
    return { success: true };
  }

  async listAttemptsForCourse(courseId: string, requester: Requester) {
    if (requester.role === Role.TEACHER) {
      const teaches = await this.prisma.scheduledLesson.findFirst({
        where: { courseId, teacher: { userId: requester.userId } },
        select: { id: true },
      });
      if (!teaches) throw new ForbiddenException('You are not assigned to teach this curriculum.');
    } else if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    return this.prisma.assessmentAttempt.findMany({
      where: { assessment: { lesson: { courseId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true } },
        assessment: { select: { title: true, type: true } },
      },
    });
  }
}
