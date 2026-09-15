// FILE PATH: server/src/reschedule/dto/create-reschedule-event.dto.ts
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRescheduleEventDto {
  @IsIn(['RESCHEDULE', 'CANCEL'])
  action: 'RESCHEDULE' | 'CANCEL';

  @IsIn(['STUDENT_REQUESTED', 'TEACHER_EMERGENCY'])
  category: 'STUDENT_REQUESTED' | 'TEACHER_EMERGENCY';

  // "Who requested this?" — STUDENT/PARENT for a student-requested change.
  // Forced to TEACHER server-side for TEACHER_EMERGENCY regardless of what's sent.
  @IsIn(['STUDENT', 'PARENT', 'TEACHER'])
  initiatedByRole: 'STUDENT' | 'PARENT' | 'TEACHER';

  @IsOptional()
  @IsISO8601(
    {},
    { message: 'New start time must be a valid ISO 8601 date string.' },
  )
  newStart?: string;

  @IsOptional()
  @IsISO8601(
    {},
    { message: 'New end time must be a valid ISO 8601 date string.' },
  )
  newEnd?: string;

  // Required for STUDENT_REQUESTED — the proof upload URL.
  @IsOptional()
  @IsString()
  proofUrl?: string;

  // Required (short reason) for TEACHER_EMERGENCY; optional note otherwise.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  // Required confirmation for TEACHER_EMERGENCY: "Have you informed the student/parent?"
  @IsOptional()
  @IsBoolean()
  informedStudent?: boolean;
}
