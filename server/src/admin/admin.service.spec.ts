import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { StripeService } from '../payments/stripe.service';
import { AuditService } from '../audit/audit.service';
import { PayoutsService } from '../payouts/payouts.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AdminService - assignTeacherToStudent', () => {
  let service: AdminService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    teacherProfile: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      teacherProfile: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: {} },
        {
          provide: AuditService,
          useValue: { log: jest.fn(), getHistory: jest.fn() },
        },
        { provide: PayoutsService, useValue: {} },
        { provide: StudentLedgerService, useValue: {} },
        {
          provide: SchedulingService,
          useValue: { clearStudentSchedule: jest.fn() },
        },
        { provide: NotificationsService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('assigns a teacher to a student successfully', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      role: 'STUDENT',
    });
    prisma.teacherProfile.findUnique.mockResolvedValue({ id: 'teacher-1' });
    prisma.user.update.mockResolvedValue({
      id: 'student-1',
      fullName: 'Ada Lovelace',
      assignedTeacherId: 'teacher-1',
      assignedTeacher: {
        id: 'teacher-1',
        subjects: [],
        user: { fullName: 'Mr T', avatarUrl: null },
      },
    });

    const result = await service.assignTeacherToStudent(
      'student-1',
      'teacher-1',
      'admin-1',
    );

    expect(prisma.teacherProfile.findUnique).toHaveBeenCalledWith({
      where: { id: 'teacher-1' },
      select: { id: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { assignedTeacherId: 'teacher-1' },
      select: expect.any(Object),
    });
    expect(result.assignedTeacherId).toBe('teacher-1');
  });

  it('clears the assignment when given null', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      role: 'STUDENT',
    });
    prisma.user.update.mockResolvedValue({
      id: 'student-1',
      fullName: 'Ada Lovelace',
      assignedTeacherId: null,
      assignedTeacher: null,
    });

    const result = await service.assignTeacherToStudent(
      'student-1',
      null,
      'admin-1',
    );

    expect(prisma.teacherProfile.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { assignedTeacherId: null },
      select: expect.any(Object),
    });
    expect(result.assignedTeacherId).toBeNull();
  });

  it('throws NotFoundException for a non-existent student', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.assignTeacherToStudent('missing-student', 'teacher-1', 'admin-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the target user is not a STUDENT', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'TEACHER' });

    await expect(
      service.assignTeacherToStudent('user-1', 'teacher-1', 'admin-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for a non-existent teacher profile id', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      role: 'STUDENT',
    });
    prisma.teacherProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.assignTeacherToStudent('student-1', 'missing-teacher', 'admin-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
