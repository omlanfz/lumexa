// FILE PATH: server/src/assessments/dto/assessment.dto.ts

import { Type } from 'class-transformer';
import { STRUCTURED_MAX_ANSWER_LENGTH } from '../../structured-assessments/structured.constants';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Longest coding-project submission accepted (characters). A ~15-minute
 *  project is a few dozen lines; this only exists to bound storage. */
export const MAX_CODE_LENGTH = 20_000;

export class StartAttemptDto {
  /** The student's own scheduled class for this test — the server checks it
   *  belongs to them, to this assessment, and that the test is open. */
  @IsString()
  @MinLength(1)
  scheduledLessonId: string;
}

/** `selectedIndex` is the position the option had on the student's screen
 *  (options are shuffled per student); null clears the answer. */
export class SaveAnswerDto {
  @IsString()
  @MinLength(1)
  questionId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9)
  selectedIndex?: number | null;
}

export class SaveCodeDto {
  @IsString()
  @MinLength(1)
  questionId: string;

  @IsString()
  @MaxLength(MAX_CODE_LENGTH)
  code: string;
}

/** The Little Coders practical, handed in as links and a note (the files are uploaded
 *  separately, see AssessmentFilesService). Links must be https addresses. */
/** Structured assessments, Part B: the written answer to one short-answer question. */
export class SaveShortAnswerDto {
  @IsString()
  @MinLength(1)
  questionId: string;

  @IsString()
  @MaxLength(STRUCTURED_MAX_ANSWER_LENGTH)
  answer: string;
}

export class SavePracticalDto {
  @IsString()
  @MinLength(1)
  questionId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(600, { each: true })
  links?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/** Final submit. `answers`/`practical` carry the student's complete latest
 *  state, so a submission can never lose an answer whose autosave request
 *  failed or arrived late. Both are optional: omitted = use what is saved. */
export class SubmitAttemptDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerDto)
  answers?: SaveAnswerDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => SaveCodeDto)
  practical?: SaveCodeDto[];

  /** Structured assessments: the latest written answers of Part B, saved with the submission. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SaveShortAnswerDto)
  shortAnswers?: SaveShortAnswerDto[];

  /** Little Coders: the latest links / note of the practical project, saved with the submission. */
  @IsOptional()
  @ValidateNested()
  @Type(() => SavePracticalDto)
  project?: SavePracticalDto;
}

/** Admin: which practical-project version a Little Coders Final Assessment class is given. */
export class SetVariantDto {
  @IsOptional()
  @IsIn(['SCRATCH_AI', 'PYTHON'])
  variant?: 'SCRATCH_AI' | 'PYTHON' | null;
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

export class AttachBankDto {
  /** Link the lesson to this existing assessment's question bank. Omit to
   *  create an empty bank of its own. */
  @IsOptional()
  @IsString()
  sourceAssessmentId?: string;
}
