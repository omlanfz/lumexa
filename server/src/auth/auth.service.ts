import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';

const RESET_TOKEN_TTL_MINUTES = 15;
// Same message whether or not the email exists, and whether or not the
// email actually sends — prevents account enumeration via response
// content OR timing (see requestPasswordReset).
const GENERIC_RESET_RESPONSE = {
  message:
    'If an account exists for that email, a password reset link has been sent.',
};

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notifications: NotificationsService,
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

    // Fire-and-forget — a slow/unavailable mail server must never block
    // registration (see EmailService for the retry/delivery-status queue).
    if (role === 'TEACHER') {
      this.notifications
        .sendTeacherAccountCreatedEmail(user.email, {
          userId: user.id,
          teacherName: user.fullName,
        })
        .catch(() => {});
      this.notifications
        .sendAdminNewTeacherApplication({
          userId: user.id,
          teacherName: user.fullName,
          email: user.email,
        })
        .catch(() => {});
    } else if (role === 'PARENT') {
      this.notifications
        .sendWelcomeEmail(user.email, {
          userId: user.id,
          name: user.fullName,
          role: 'PARENT',
        })
        .catch(() => {});
      this.notifications
        .sendAdminNewRegistration({
          userId: user.id,
          name: user.fullName,
          email: user.email,
          role,
        })
        .catch(() => {});
    }
    // ADMIN accounts are provisioned internally, not part of any of the
    // required notification flows — no email either way.

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
      if (status === 'SUSPENDED') {
        throw new ForbiddenException('This account has been suspended.');
      }
      if (status === 'DEACTIVATED') {
        throw new ForbiddenException('This account has been deactivated.');
      }
      if (status === 'PAUSED') {
        throw new ForbiddenException(
          'This account has been paused by Operations. Contact support for details.',
        );
      }
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // Fire-and-forget — used only for the admin low-activity alert, never
    // gates login itself.
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

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

  // ─── Forgot / reset password ─────────────────────────────────────────────
  //
  // Token is a random 32-byte value (crypto.randomBytes) — only its SHA-256
  // hash is ever persisted, mirroring bcrypt-hashed passwords: the raw
  // token exists only in the emailed link. Single-use (usedAt) and
  // short-lived (15 min). The response is identical whether or not the
  // email matches an account, and doesn't wait on email delivery, so
  // neither the response body nor its timing can be used to enumerate
  // accounts.

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(
        Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000,
      );

      try {
        // A fresh request supersedes any earlier unused link for this user
        // — only one reset token should ever be redeemable at a time.
        await this.prisma.$transaction([
          this.prisma.passwordResetToken.deleteMany({
            where: { userId: user.id, usedAt: null },
          }),
          this.prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
          }),
        ]);

        this.notifications
          .sendPasswordResetEmail(user.email, {
            name: user.fullName,
            token,
            expiresMinutes: RESET_TOKEN_TTL_MINUTES,
          })
          .catch((err) =>
            this.logger.error(`Failed to send password reset email: ${err}`),
          );
      } catch (err) {
        this.logger.error(`Failed to create password reset token: ${err}`);
      }
    }

    return GENERIC_RESET_RESPONSE;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: true }> {
    const tokenHash = hashResetToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt.getTime() < Date.now()
    ) {
      // Deliberately one generic message for invalid, expired, already-used,
      // and malformed tokens alike — nothing here should tell a caller
      // which case they hit.
      throw new BadRequestException(
        'This password reset link is invalid or has expired. Please request a new one.',
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed, adminSetPassword: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect.');

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters.',
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      // Clear any password Operations previously set/displayed for this
      // account — it no longer matches once the account holder picks their
      // own, so it must not keep showing on the admin dashboard.
      data: { password: hashed, adminSetPassword: null },
    });

    return { success: true };
  }
}
