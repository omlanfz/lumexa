import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(
    email: string,
    password: string,
    fullName: string,
    role: Role = 'PARENT',
  ) {
    // Check for existing email before hashing (saves compute on duplicates)
    const existing = await this.usersService.findOne(email);
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.usersService.createUser({
      email,
      password: hashedPassword,
      fullName,
      role,
    });

    if (role === 'TEACHER') {
      await this.usersService.createTeacherProfile(user.id);
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async login(email: string, pass: string) {
    const user = await this.usersService.findOne(email);

    // Use a constant-time comparison to prevent timing attacks
    const passwordValid = user && (await bcrypt.compare(pass, user.password));

    if (!user || !passwordValid) {
      // Same message for both "user not found" and "wrong password"
      // prevents email enumeration attacks
      throw new UnauthorizedException('Invalid email or password.');
    }

    // For STUDENT accounts, check accountStatus before issuing token
    if (user.role === 'STUDENT') {
      const status = user.accountStatus as string | undefined;
      if (status === 'PENDING_CONSENT') {
        throw new ForbiddenException(
          'Your account is awaiting parental consent. Please check the email sent to your billing contact.',
        );
      }
      if (status === 'SUSPENDED') {
        throw new ForbiddenException('This account has been suspended.');
      }
      if (status === 'DEACTIVATED') {
        throw new ForbiddenException('This account has been deactivated.');
      }
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        coppaConsentAt: user.coppaConsentAt,
      },
    };
  }

  async recordCoppaConsent(userId: string) {
    return this.usersService.updateCoppaConsent(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect.');

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters.');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { success: true };
  }
}
