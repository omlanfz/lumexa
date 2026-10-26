import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/** The guest-join token is a credential: no list/update response carries it. */
function withoutSecrets<T extends { guestToken: string | null }>(
  lead: T,
): Omit<T, 'guestToken'> {
  const { guestToken: _omit, ...rest } = lead;
  void _omit;
  return rest;
}

/** Legacy lead pipeline (list + status). Booking lives in TrialBookingService. */
@Injectable()
export class TrialService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 20) {
    const [leads, total] = await this.prisma.$transaction([
      this.prisma.trialLead.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trialLead.count(),
    ]);
    return {
      leads: leads.map(withoutSecrets),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(id: string, status: string) {
    return withoutSecrets(
      await this.prisma.trialLead.update({
        where: { id },
        data: { status },
      }),
    );
  }
}
