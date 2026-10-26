// FILE PATH: server/src/batches/dto/batch.dto.ts

import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ScheduleSlotDto } from '../../scheduling/dto/set-schedule.dto';
import { MAX_BATCH_STUDENTS } from '../batch.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToUndefined = ({ value }: { value: unknown }) => {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' ? undefined : v;
};

/** A batch's weekly schedule: where it starts and the weekly meeting times
 * (Asia/Dhaka). Same shape the 1-to-1 schedule uses. */
export class BatchScheduleDto {
  /** First class date, 'YYYY-MM-DD', Asia/Dhaka. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'firstClassDate must be in YYYY-MM-DD format',
  })
  firstClassDate: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one weekly time slot is required.' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}

export class CreateBatchDto extends BatchScheduleDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_BATCH_STUDENTS)
  maxStudents?: number;

  /** Where the batch starts in the curriculum until it has taught a class. */
  @IsOptional()
  @IsInt()
  @Min(1)
  startLessonNumber?: number;
}

export class UpdateBatchDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_BATCH_STUDENTS)
  maxStudents?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'ARCHIVED'])
  status?: 'ACTIVE' | 'ARCHIVED';
}

export class ChangeBatchTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherId: string;
}

/** The explicit answers an admin gives to the things a placement changes. */
export class EnrollmentDecisionsDto {
  @IsOptional()
  @IsBoolean()
  acceptTeacherChange?: boolean;

  @IsOptional()
  @IsIn(['SKIP_TO_BATCH', 'REBASE_BATCH'])
  progress?: 'SKIP_TO_BATCH' | 'REBASE_BATCH';

  @IsOptional()
  @IsBoolean()
  replaceUpcoming?: boolean;
}

export class AddBatchStudentDto {
  @IsString()
  @IsNotEmpty()
  studentUserId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnrollmentDecisionsDto)
  decisions?: EnrollmentDecisionsDto;
}

/** A batch created in the middle of enrolling one student: the student's
 * teacher and curriculum become the batch's, and the batch starts at the
 * student's next lesson. */
export class NewBatchForStudentDto extends BatchScheduleDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_BATCH_STUDENTS)
  maxStudents?: number;
}

/** Places a student in a batch: an existing one, or a new one made right here. */
export class EnrollStudentInBatchDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  batchId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewBatchForStudentDto)
  newBatch?: NewBatchForStudentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnrollmentDecisionsDto)
  decisions?: EnrollmentDecisionsDto;
}
