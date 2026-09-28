import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SUBMISSION_FEEDBACK_TAGS } from '../submission-feedback-tags';

export class SubmissionFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class SubmitHomeworkDto {
  @IsString()
  @MinLength(1)
  scheduledLessonId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SubmissionFileDto)
  files?: SubmissionFileDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_protocol: true }, { each: true })
  links?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReviewSubmissionDto {
  @IsIn(['APPROVED', 'NEEDS_CHANGES'])
  status: 'APPROVED' | 'NEEDS_CHANGES';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SUBMISSION_FEEDBACK_TAGS.length)
  @IsIn(SUBMISSION_FEEDBACK_TAGS, { each: true })
  feedbackTags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
