import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Find a user by their email (used for Login)
  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Create a new user (used for Register)
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async createTeacherProfile(userId: string) {
    return this.prisma.teacherProfile.create({
      data: {
        userId,
        bio: 'Ready to launch!',
      },
    });
  }
}
