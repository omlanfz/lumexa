import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(72, { message: 'Password cannot exceed 72 characters.' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters.' })
  fullName: string;

  @IsEnum(Role, { message: 'Role must be PARENT, TEACHER, or ADMIN.' })
  @IsOptional()
  role?: Role;
}
