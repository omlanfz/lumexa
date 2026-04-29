import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTrialDto } from './dto/create-trial.dto';

@Injectable()
export class TrialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTrialDto) {
    const lead = await this.prisma.trialLead.create({
      data: {
        parentName: dto.parentName,
        parentEmail: dto.parentEmail,
        childName: dto.childName,
        childAge: dto.childAge,
        subject: dto.subject,
        timezone: dto.timezone,
        message: dto.message,
      },
    });
    return { success: true, leadId: lead.id };
  }

  async list(page = 1, limit = 20) {
    const [leads, total] = await this.prisma.$transaction([
      this.prisma.trialLead.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trialLead.count(),
    ]);
    return { leads, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.trialLead.update({
      where: { id },
      data: { status },
    });
  }
}
