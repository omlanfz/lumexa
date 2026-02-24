import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CoppaConsentDto } from './dto/coppa-consent.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.fullName,
      dto.role,
    );
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * Called after a parent has read and accepted the COPPA consent notice.
   * Records the consent timestamp on their account.
   * Must be called before a parent can add students or make bookings.
   */
  @Post('coppa-consent')
  @UseGuards(AuthGuard('jwt'))
  recordCoppaConsent(@Request() req, @Body() dto: CoppaConsentDto) {
    return this.authService.recordCoppaConsent(req.user.userId);
  }
}
