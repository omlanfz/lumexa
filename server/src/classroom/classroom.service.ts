import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class ClassroomService {
  constructor(private prisma: PrismaService) {}

  async joinLab(userId: string, bookingId: string) {
    // 1. Verify Mission
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        shift: {
          include: {
            teacher: {
              include: {
                user: true, // <--- FIX: We explicitly ask for the User info now
              },
            },
          },
        },
      },
    });

    if (!booking)
      throw new BadRequestException('Star Lab coordinates not found.');

    // 2. Identify Explorer
    let participantName = '';

    // Is it the Teacher (Pilot)?
    if (booking.shift.teacher.userId === userId) {
      participantName = 'Pilot ' + booking.shift.teacher.user.fullName;
    }
    // Is it the Parent's Cadet?
    else if (booking.student.parentId === userId) {
      participantName = 'Cadet ' + booking.student.name;
    } else {
      throw new BadRequestException(
        'Access Denied: You are not assigned to this Lab.',
      );
    }

    // 3. Generate Star Lab Pass (Token)
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: userId, name: participantName },
    );

    at.addGrant({
      roomJoin: true,
      room: bookingId,
      canPublish: true,
      canSubscribe: true,
    });

    return { token: await at.toJwt(), url: process.env.LIVEKIT_URL };
  }
}
