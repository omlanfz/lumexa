import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CoppaConsentDto } from './dto/coppa-consent.dto';

class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

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

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('coppa-consent')
  @UseGuards(AuthGuard('jwt'))
  recordCoppaConsent(@Request() req, @Body() dto: CoppaConsentDto) {
    // The DTO only validates it is a boolean.
    // We additionally require it to be true here — false means they declined.
    if (!dto.consentGiven) {
      throw new BadRequestException(
        'You must accept the parental consent agreement.',
      );
    }
    return this.authService.recordCoppaConsent(req.user.userId);
  }
}
