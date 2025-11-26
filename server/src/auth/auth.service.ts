import { Injectable, UnauthorizedException } from '@nestjs/common';
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

  // REGISTER LOGIC
  async register(
    email: string,
    password: string,
    fullName: string,
    role: Role = 'PARENT',
  ) {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the User
    const user = await this.usersService.createUser({
      email,
      password: hashedPassword,
      fullName,
      role, // <--- Save the role
    });

    // If they are a TEACHER, create an empty profile for them automatically
    if (role === 'TEACHER') {
      await this.usersService.createTeacherProfile(user.id);
    }

    return user;
  }

  // LOGIN LOGIC
  async login(email: string, pass: string) {
    const user = await this.usersService.findOne(email);

    // Check if user exists AND password matches
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate the Token
    const payload = { email: user.email, sub: user.id, role: user.role }; // <--- Add Role to Token

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        // <--- Send user details back too
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
