import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitHomeworkDto {
  @IsString()
  @MinLength(1)
  scheduledLessonId: string;

  @IsString()
  @MinLength(1)
  fileUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
