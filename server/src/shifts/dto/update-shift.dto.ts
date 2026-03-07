// FILE PATH: server/src/shifts/dto/update-shift.dto.ts
//
// Used by PATCH /shifts/:id (reschedule flow in calendar/page.tsx CancelModal).
// All fields are optional — only provided fields are updated.

import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsISO8601(
    {},
    { message: 'Start time must be a valid ISO 8601 date string.' },
  )
  start?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'End time must be a valid ISO 8601 date string.' })
  end?: string;

  // Sent by the frontend for audit purposes — not persisted in this MVP but
  // available for future TeacherCancellation / audit log integration.
  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
