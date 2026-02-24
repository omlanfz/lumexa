import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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

    const hashedPassword = await bcrypt.hash(password, 12); // 12 rounds for production

    const user = await this.usersService.createUser({
      email,
      password: hashedPassword,
      fullName,
      role,
    });

    if (role === 'TEACHER') {
      await this.usersService.createTeacherProfile(user.id);
    }

    // Return safe user data (never return the password hash)
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
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
}
