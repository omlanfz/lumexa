// FILE PATH: server/src/shifts/dto/create-shift.dto.ts
//
// BUGS FIXED vs previous version:
//
// BUG 1 — Duplicate `start` and `end` fields
//   The previous DTO declared both @IsISO8601() and @IsDateString() for each
//   field, AND declared the property twice. TypeScript merges duplicate
//   declarations unpredictably — the second `start: string` silently overwrote
//   the first, stripping the @IsISO8601 decorator. class-validator then only
//   saw @IsDateString, which is fine, but the intent was garbled.
//   FIX: Each field declared once. Using @IsISO8601() consistently (it's a
//   superset of @IsDateString and is the canonical validator for ISO 8601).
//
// BUG 2 — Missing imports
//   @IsISO8601, @IsOptional, @IsBoolean, @IsNumber, @Min, @Max were used but
//   never imported. Would throw "Cannot read properties of undefined" at startup.
//   FIX: All decorators imported explicitly.
//
// RECURRING FIELDS:
//   recurring  — if true, create one shift per week for `recurWeeks` weeks
//   recurWeeks — how many weekly copies to create (1–12, default 1)
//   Both are optional; omitting them means a single one-off shift.

import {
  IsISO8601,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateShiftDto {
  @IsISO8601(
    {},
    { message: 'Start time must be a valid ISO 8601 date string.' },
  )
  start: string;

  @IsISO8601({}, { message: 'End time must be a valid ISO 8601 date string.' })
  end: string;

  // ── Recurring weekly availability ──────────────────────────────────────────
  // If recurring=true, the service will create `recurWeeks` copies of the slot,
  // advancing by 7 days each time. All copies are validated for overlaps.
  // Returns: Shift[] (array) when recurring=true, Shift (object) when false.

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  recurWeeks?: number;
}
