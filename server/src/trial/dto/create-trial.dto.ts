import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class CreateTrialDto {
  @IsString()
  @MaxLength(80)
  parentName: string;

  @IsEmail()
  parentEmail: string;

  @IsString()
  @MaxLength(50)
  childName: string;

  @IsInt()
  @Min(5)
  @Max(19)
  childAge: number;

  @IsString()
  @MaxLength(100)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
