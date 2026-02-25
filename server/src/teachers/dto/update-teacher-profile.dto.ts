// FILE PATH: server/src/teachers/dto/update-teacher-profile.dto.ts
// ACTION: CREATE this folder and file.

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateTeacherProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(500)
  hourlyRate?: number;
}
