// FILE PATH: server/src/trial/dto/trial.dto.ts
//
// Request validation for the public booking form and the admin trial
// endpoints. Strings are trimmed, email is lower-cased, and the phone number
// is normalised to E.164 *before* validation, so the service only ever sees
// clean values. Child age is 6–18 inclusive — the same constants the client
// and the slot engine use.

import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsISO8601,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { TRIAL_MAX_AGE, TRIAL_MIN_AGE } from '../trial.constants';
import { normalizePhone } from '../phone.util';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToUndefined = ({ value }: { value: unknown }) => {
  const v = typeof value === 'string' ? value.trim() : value;
  return v === '' ? undefined : v;
};
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const toE164 = ({ value }: { value: unknown }) => {
  const r = normalizePhone(value);
  return r.ok ? r.e164 : value;
};

// No control characters (newlines etc.) in values that end up in email
// subjects and WhatsApp variables.
// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
const NO_CONTROL_CHARS = /^[^\u0000-\u001f\u007f]*$/;
const NAME_MESSAGE = 'Please use plain text with no line breaks.';

export function IsTrialPhone(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isTrialPhone',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => normalizePhone(value).ok,
        defaultMessage: (args: ValidationArguments) => {
          const r = normalizePhone(args.value);
          return r.ok ? '' : r.reason;
        },
      },
    });
  };
}

const AGE_MESSAGE = `Trial classes are for children aged ${TRIAL_MIN_AGE} to ${TRIAL_MAX_AGE}.`;

class TrialPersonFields {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(NO_CONTROL_CHARS, { message: NAME_MESSAGE })
  parentName: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @MaxLength(254)
  parentEmail: string;

  @Transform(toE164)
  @IsTrialPhone()
  parentPhone: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(NO_CONTROL_CHARS, { message: NAME_MESSAGE })
  childName: string;

  @Type(() => Number)
  @IsInt({ message: AGE_MESSAGE })
  @Min(TRIAL_MIN_AGE, { message: AGE_MESSAGE })
  @Max(TRIAL_MAX_AGE, { message: AGE_MESSAGE })
  childAge: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(NO_CONTROL_CHARS, { message: NAME_MESSAGE })
  subject: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  message?: string;

  /** The appointment start as an ISO-8601 instant, e.g. 2026-11-04T10:00:00.000Z */
  @IsISO8601({ strict: true })
  startAt: string;
}

/** POST /trial — the public booking form. */
export class CreateTrialDto extends TrialPersonFields {
  @IsBoolean()
  @Equals(true, {
    message:
      'Please tick the box to agree to receive your trial booking confirmation and reminder on WhatsApp.',
  })
  whatsappConsent: boolean;
}

/** POST /admin/trial/appointments — an admin books on a parent's behalf. */
export class AdminCreateTrialDto extends TrialPersonFields {
  @IsBoolean()
  whatsappConsent: boolean;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}

export class RescheduleTrialDto {
  @IsISO8601({ strict: true })
  startAt: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** Optionally move the class to a different teacher at the same time. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(64)
  teacherId?: string;
}

export class AssignTeacherDto {
  /** TeacherProfile id (not the user id). */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  teacherId: string;
}

export class TrialOutcomeDto {
  @IsIn(['COMPLETED', 'MISSED'])
  outcome: 'COMPLETED' | 'MISSED';

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Body of the public guest endpoints. The token is validated for shape in the
 *  service (and again by the database lookup) — here it is only bounded. */
export class GuestJoinDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token: string;
}

export class CancelTrialDto {
  /** Internal — recorded in the audit trail, never sent to the parent. */
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  /** Optional message shown to the parent in the cancellation email. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(500)
  parentNote?: string;
}

export class UpdateTrialNotesDto {
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  adminNotes: string;
}

// ─── Availability ───────────────────────────────────────────────────────────

const TIME_RE = /^([01]?\d|2[0-4]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_MESSAGE = 'Use a 24-hour time such as 15:00.';
const DATE_MESSAGE = 'Use a date such as 2026-11-05.';

export class RuleDto {
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2, 3, 4, 5, 6])
  weekday: number;

  @Transform(trim)
  @Matches(TIME_RE, { message: TIME_MESSAGE })
  startTime: string;

  @Transform(trim)
  @Matches(TIME_RE, { message: TIME_MESSAGE })
  endTime: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_RE, { message: DATE_MESSAGE })
  effectiveFrom?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(DATE_RE, { message: DATE_MESSAGE })
  effectiveUntil?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class WindowDto {
  @Transform(trim)
  @Matches(DATE_RE, { message: DATE_MESSAGE })
  date: string;

  @Transform(trim)
  @Matches(TIME_RE, { message: TIME_MESSAGE })
  startTime: string;

  @Transform(trim)
  @Matches(TIME_RE, { message: TIME_MESSAGE })
  endTime: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class BlockDto {
  @Transform(trim)
  @Matches(DATE_RE, { message: DATE_MESSAGE })
  startDate: string;

  @Transform(trim)
  @Matches(DATE_RE, { message: DATE_MESSAGE })
  endDate: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(TIME_RE, { message: TIME_MESSAGE })
  startTime?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(TIME_RE, { message: TIME_MESSAGE })
  endTime?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reason: string;
}
