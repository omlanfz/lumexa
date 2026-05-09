import {
  IsEmail,
  IsString,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(72)
  password: string;

  @Type(() => Number)
  @IsInt()
  @Min(5, { message: 'Age must be at least 5.' })
  @Max(21, { message: 'Age must be 21 or under.' })
  age: number;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  // Required when age < 16 (COPPA age-gate)
  @IsOptional()
  @IsEmail({}, { message: 'Billing contact must be a valid email address.' })
  billingContactEmail?: string;
}
