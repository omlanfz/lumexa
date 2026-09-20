import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @IsString()
  category: string;

  @IsString()
  level: string;

  // Optional — most courses are created from a known curriculum where the
  // admin doesn't need to think about age brackets; falls back to the
  // Course model's schema defaults (6–18) when omitted.
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(18)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(18)
  ageMax?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  sessions: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  gemCost?: number;

  // Total list price for the course, in poisha (BDT minor unit). Used as the
  // default per-lesson rate (priceCents / sessions) — see StudentLedgerService.
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // True only for a one-off curriculum built for a single student/parent via
  // the Custom Curriculum Builder — see Course.isCustom's schema comment.
  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;
}
