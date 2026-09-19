// FILE PATH: server/src/disputes/disputes.service.ts
//
// Minimal filing + resolution record for "a class dispute or complaint
// filed by a student/teacher" — no existing model covered this (Review is
// a star rating, not a complaint; see the Dispute model's doc comment in
// schema.prisma). Filing always alerts admins by email; there is no
// separate in-app queue beyond GET /admin/disputes.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async file(filedByUserId: string, filedByRole: Role, dto: CreateDisputeDto) {
    const filer = await this.prisma.user.findUnique({
      where: { id: filedByUserId },
      select: { fullName: true },
    });
    if (!filer) throw new NotFoundException('User not found.');

    const dispute = await this.prisma.dispute.create({
      data: {
        filedByUserId,
        filedByRole,
        againstUserId: dto.againstUserId,
        scheduledLessonId: dto.scheduledLessonId,
        bookingId: dto.bookingId,
        category: dto.category,
        description: dto.description,
      },
    });

    this.notifications
      .sendAdminDisputeFiled({
        disputeId: dispute.id,
        filedByName: filer.fullName,
        filedByRole,
        category: dto.category,
        description: dto.description,
      })
      .catch(() => {});

    return dispute;
  }

  async listMine(userId: string) {
    return this.prisma.dispute.findMany({
      where: { filedByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(status?: 'OPEN' | 'RESOLVED') {
    return this.prisma.dispute.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async resolve(disputeId: string, adminUserId: string, resolutionNotes: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    if (dispute.status === 'RESOLVED') {
      throw new BadRequestException('This dispute has already been resolved.');
    }

    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedByAdminId: adminUserId,
        resolutionNotes,
      },
    });
  }
}
