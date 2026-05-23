import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  grade?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
