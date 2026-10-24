// FILE PATH: server/src/assessments/dto/test-report.dto.ts

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** A teacher's decision on one question. `correct` omitted/null removes the
 *  override and goes back to the automatic result. */
export class QuestionOverrideDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsBoolean()
  correct?: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

/** The teacher's mark for one rubric criterion; null clears it. */
export class RubricScoreDto {
  @IsString()
  criterion: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  score?: number | null;
}

export class UpdateTestReportDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuestionOverrideDto)
  questionOverrides?: QuestionOverrideDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  codingRubricScores?: RubricScoreDto[];

  @IsOptional() @IsString() @MaxLength(2000) feedback?: string | null;
  @IsOptional() @IsString() @MaxLength(1500) strengths?: string | null;
  @IsOptional() @IsString() @MaxLength(1500) improvements?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) codingFeedback?: string | null;

  /** The report's `updatedAt` as the teacher last saw it — if the report has
   *  changed since (another tab, an admin), the save is refused instead of
   *  silently overwriting. */
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}

export const REPORT_STATUS_FILTERS = [
  'PENDING',
  'PENDING_REVIEW',
  'PENDING_CODE_EVALUATION',
  'READY_TO_SHARE',
  'SHARED_WITH_PARENTS',
] as const;

export class ListTestReportsQueryDto {
  @IsOptional()
  @IsIn(REPORT_STATUS_FILTERS as unknown as string[])
  status?: (typeof REPORT_STATUS_FILTERS)[number];

  @IsOptional()
  @IsIn(['COURSE_TEST', 'STAGE_TEST', 'FINAL_TEST'])
  type?: 'COURSE_TEST' | 'STAGE_TEST' | 'FINAL_TEST';

  @IsOptional()
  @IsString()
  studentUserId?: string;
}
