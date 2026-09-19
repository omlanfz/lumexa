// FILE PATH: server/src/alerts/alerts.service.ts
//
// In-app dashboard notifications (distinct from NotificationsService, which
// only sends email). Used for automatic, system-triggered events a user
// should see the next time they open their dashboard — e.g. a teacher's
// late-join penalty or a completed-class earning. Append/read only: nothing
// here ever mutates a financial record, it just surfaces one that already
// happened (see PayoutsService, the actual source of truth).

import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface CreateAlertParams {
  userId: string;
  role: Role;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateAlertParams) {
    return this.prisma.dashboardAlert.create({
      data: {
        userId: params.userId,
        role: params.role,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listForUser(userId: string, limit = 20) {
    return this.prisma.dashboardAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCountForUser(userId: string) {
    return this.prisma.dashboardAlert.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, alertId: string) {
    // Scoped to userId so one user can never mark another's alert read.
    await this.prisma.dashboardAlert.updateMany({
      where: { id: alertId, userId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.dashboardAlert.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
