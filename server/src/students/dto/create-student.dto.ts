// FILE PATH: server/src/students/dto/create-student.dto.ts
// ACTION: REPLACE the existing file entirely.

import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(4)
  @Max(18)
  age: number;

  @IsOptional()
  @IsString()
  grade?: string; // e.g. "Grade 5"

  @IsOptional()
  @IsString()
  subject?: string; // e.g. "Math", "Coding"

  @IsOptional()
  @IsString()
  schoolName?: string; // COPPA-safe: school name only

  @IsOptional()
  @IsString()
  timezone?: string; // e.g. "Asia/Dhaka" — auto-detected on frontend
}
