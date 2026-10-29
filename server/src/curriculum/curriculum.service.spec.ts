import { ClassroomAdmissionStatus, LessonStatus, Role } from '@prisma/client';
import { CurriculumService } from './curriculum.service';

// Who may read a lesson's material, against a mocked Prisma. The rule under
// test: the standalone endpoint keeps an upcoming lesson locked for a student;
// the classroom's own endpoint opens the lesson of the class they are
// attending right now — and nothing else.

const STUDENT = 'stu-1';
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

interface Row {
  [k: string]: any;
}

function classRow(over: Row = {}): Row {
  return {
    id: 'sl-1',
    studentUserId: STUDENT,
    teacherId: 'teacher-1',
    classType: 'ONE_TO_ONE',
    status: LessonStatus.UPCOMING,
    start: minutesFromNow(-5),
    end: minutesFromNow(55),
    courseId: 'course-1',
    lessonNumber: 2,
    lessonId: 'lesson-1',
    batchId: null,
    batchSessionId: null,
    batchSession: null,
    batch: null,
    studentJoinedAt: new Date(),
    teacher: { userId: 'teacher-user' },
    course: { id: 'course-1', title: 'Course', slug: 'unknown-slug' },
    submission: null,
    lesson: {
      id: 'lesson-1',
      title: 'Variables',
      type: 'LEARNING',
      order: 2,
      objectives: [],
      contentMarkdown: '# Hi',
      reviewNotes: null,
      homework: null,
      checkpoint: null,
      codeSnippets: null,
      projectLinks: [],
      module: null,
      project: null,
      assessment: null,
    },
    ...over,
  };
}

function build(row: Row | null, admission: Row | null = null) {
  const prisma: any = {
    scheduledLesson: {
      findUnique: jest.fn().mockResolvedValue(row),
      findFirst: jest.fn().mockResolvedValue(null), // no completed sibling row
    },
    classroomAdmission: {
      findFirst: jest.fn().mockResolvedValue(admission),
    },
  };
  return { service: new CurriculumService(prisma), prisma };
}

const student = { userId: STUDENT, role: Role.STUDENT };
const inClassroom = { inClassroom: true };

describe('CurriculumService.getScheduledLessonDetails — attending now', () => {
  it('keeps an upcoming lesson locked on the standalone page, even mid-class', async () => {
    const { service } = build(classRow());
    const res: any = await service.getScheduledLessonDetails('sl-1', student);
    expect(res.available).toBe(false);
    expect(res.reason).toBe('UPCOMING_LOCKED');
  });

  it('opens the current lesson inside the classroom for the student who joined', async () => {
    const { service } = build(classRow());
    const res: any = await service.getScheduledLessonDetails(
      'sl-1',
      student,
      inClassroom,
    );
    expect(res.available).toBe(true);
    expect(res.lesson.title).toBe('Variables');
  });

  it('stays locked when the student has not joined through the classroom', async () => {
    const { service } = build(classRow({ studentJoinedAt: null }));
    const res: any = await service.getScheduledLessonDetails(
      'sl-1',
      student,
      inClassroom,
    );
    expect(res.available).toBe(false);
  });

  it('stays locked for a future class whose classroom has not opened', async () => {
    const { service } = build(
      classRow({ start: minutesFromNow(120), end: minutesFromNow(180) }),
    );
    const res: any = await service.getScheduledLessonDetails(
      'sl-1',
      student,
      inClassroom,
    );
    expect(res.available).toBe(false);
    expect(res.reason).toBe('UPCOMING_LOCKED');
  });

  it('stays locked once the class has been ended or cancelled', async () => {
    for (const status of [LessonStatus.INCOMPLETE, LessonStatus.CANCELLED]) {
      const { service } = build(classRow({ status }));
      const res: any = await service.getScheduledLessonDetails(
        'sl-1',
        student,
        inClassroom,
      );
      expect(res.available).toBe(false);
    }
  });

  it("follows the batch session's status, not just the student's own row", async () => {
    const { service } = build(
      classRow({
        classType: 'BATCH',
        batchSessionId: 'bs-1',
        batchSession: {
          id: 'bs-1',
          status: LessonStatus.COMPLETED,
          start: minutesFromNow(-5),
          end: minutesFromNow(55),
        },
      }),
    );
    const res: any = await service.getScheduledLessonDetails(
      'sl-1',
      student,
      inClassroom,
    );
    expect(res.available).toBe(false);
  });

  it('stays locked for a student the teacher removed and has not readmitted', async () => {
    const { service } = build(classRow(), {
      status: ClassroomAdmissionStatus.REMOVED,
    });
    const res: any = await service.getScheduledLessonDetails(
      'sl-1',
      student,
      inClassroom,
    );
    expect(res.available).toBe(false);
  });

  it("never opens another student's class", async () => {
    const { service } = build(classRow());
    await expect(
      service.getScheduledLessonDetails(
        'sl-1',
        { userId: 'someone-else', role: Role.STUDENT },
        inClassroom,
      ),
    ).rejects.toThrow('You do not have access to this class.');
  });
});
