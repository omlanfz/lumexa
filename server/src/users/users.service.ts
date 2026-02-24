import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async createTeacherProfile(userId: string) {
    return this.prisma.teacherProfile.create({
      data: {
        userId,
        bio: 'Ready to teach!',
      },
    });
  }

  /**
   * Records the timestamp of COPPA parental consent.
   * Called when a parent explicitly accepts the consent notice.
   */
  async updateCoppaConsent(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { coppaConsentAt: new Date() },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        coppaConsentAt: true,
      },
    });
  }
}
