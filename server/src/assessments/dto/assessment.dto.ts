// FILE PATH: server/src/assessments/dto/assessment.dto.ts

import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class StartAttemptDto {
  @IsOptional()
  @IsString()
  scheduledLessonId?: string;
}

export class SubmitMCQAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  selectedIndex?: number;
}

export class SubmitPracticalDto {
  @IsString()
  questionId: string;

  @IsString()
  code: string;
}

export class RecordVivaDto {
  @IsArray()
  questions: { question: string; response: string; notes?: string }[];

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateAssessmentSettingsDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsInt() @Min(1) mcqCount?: number;
  @IsOptional() randomizeQuestions?: boolean;
  @IsOptional() randomizeOptions?: boolean;
  @IsOptional() @IsInt() @Min(0) passScorePct?: number;
  @IsOptional() isPublished?: boolean;
}
