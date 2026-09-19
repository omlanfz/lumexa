import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const CATEGORIES = [
  'BEHAVIOR',
  'QUALITY',
  'BILLING',
  'TECHNICAL',
  'OTHER',
] as const;

export class CreateDisputeDto {
  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

  @IsOptional()
  @IsString()
  scheduledLessonId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  againstUserId?: string;
}
