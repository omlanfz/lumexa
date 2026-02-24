import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET environment variable is not set. The application cannot start securely.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    // This object is attached to req.user on every protected route
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role, // ← role is now available to RolesGuard
    };
  }
}
