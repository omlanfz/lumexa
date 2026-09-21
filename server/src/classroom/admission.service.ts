// FILE PATH: server/src/classroom/admission.service.ts
//
// Google Meet-style "knock to rejoin" after a teacher removes a
// participant. Removing someone disconnects them from the LiveKit room
// (see ClassroomService.removeParticipant) but must never permanently
// block them — this service is what lets them ask to come back in, and
// lets the teacher Admit/Deny that request.

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClassroomAdmissionStatus } from '@prisma/client';

export type AdmissionCheckResult =
  | { ok: true }
  | { ok: false; admissionId: string; status: 'PENDING' };

// No dependency on ClassroomService on purpose — ClassroomService depends
// on THIS (join/removeParticipant call checkJoin/markRemoved directly), so
// this stays a leaf service to avoid a circular DI graph. The teacher-only
// endpoints (listPending/decide) take the caller's identity as a plain
// param and are only ever reached via ClassroomController, which asserts
// "is this the teacher of this room" itself before calling in.
@Injectable()
export class AdmissionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called right before a join token would be issued. Only ever gates a
   * participant whose most recent admission row for this room is REMOVED —
   * everyone else (no history, previously APPROVED, previously DENIED-then-
   * retrying) joins normally, same as before this feature existed. */
  async checkJoin(
    room: string,
    userId: string,
    displayName: string,
    role: 'TEACHER' | 'STUDENT',
  ): Promise<AdmissionCheckResult> {
    const latest = await this.prisma.classroomAdmission.findFirst({
      where: { room, userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest || latest.status !== ClassroomAdmissionStatus.REMOVED) {
      return { ok: true };
    }

    // Reuse an already-pending request from the same removal instead of
    // spawning a duplicate on every join retry/poll.
    const pending = await this.prisma.classroomAdmission.findFirst({
      where: { room, userId, status: ClassroomAdmissionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) return { ok: false, admissionId: pending.id, status: 'PENDING' };

    const created = await this.prisma.classroomAdmission.create({
      data: { room, userId, displayName, role, status: ClassroomAdmissionStatus.PENDING },
    });
    return { ok: false, admissionId: created.id, status: 'PENDING' };
  }

  async markRemoved(room: string, userId: string, displayName: string, role: string): Promise<void> {
    await this.prisma.classroomAdmission.create({
      data: { room, userId, displayName, role, status: ClassroomAdmissionStatus.REMOVED },
    });
  }

  /** Caller (ClassroomController) must have already verified teacherUserId
   * is this room's teacher. */
  async listPending(room: string) {
    return this.prisma.classroomAdmission.findMany({
      where: { room, status: ClassroomAdmissionStatus.PENDING },
      orderBy: { requestedAt: 'asc' },
    });
  }

  /** Caller (ClassroomController) must have already verified teacherUserId
   * is this room's teacher. */
  async decide(
    teacherUserId: string,
    room: string,
    admissionId: string,
    decision: 'APPROVE' | 'DENY',
  ): Promise<{ ok: true }> {
    const admission = await this.prisma.classroomAdmission.findUnique({ where: { id: admissionId } });
    if (!admission || admission.room !== room) throw new BadRequestException('Admission request not found.');
    if (admission.status !== ClassroomAdmissionStatus.PENDING) {
      throw new BadRequestException('This request has already been resolved.');
    }
    await this.prisma.classroomAdmission.update({
      where: { id: admissionId },
      data: {
        status: decision === 'APPROVE' ? ClassroomAdmissionStatus.APPROVED : ClassroomAdmissionStatus.DENIED,
        resolvedAt: new Date(),
        resolvedBy: teacherUserId,
      },
    });
    return { ok: true };
  }

  /** Student polls this while waiting. No auth beyond "you must know the
   * admission id", which is only ever handed to the student it belongs to. */
  async getStatus(admissionId: string, userId: string) {
    const admission = await this.prisma.classroomAdmission.findUnique({ where: { id: admissionId } });
    if (!admission || admission.userId !== userId) throw new ForbiddenException('Not found.');
    return { status: admission.status };
  }
}
