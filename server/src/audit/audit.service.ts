// FILE PATH: server/src/audit/audit.service.ts
//
// One append-only record of who did what, to which entity, and why. Never
// updated or deleted. Surfaced inline on the Classes/Teachers/Students/
// Payouts screens that touch the relevant entity — there is no standalone
// Audit Log page.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface AuditLogParams {
  actorId: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  beforeData?: unknown;
  afterData?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        reason: params.reason,
        beforeData: params.beforeData as any,
        afterData: params.afterData as any,
      },
    });
  }

  /** History for one entity (e.g. a teacher, a student, a booking). */
  async getHistory(entityType: string, entityId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
