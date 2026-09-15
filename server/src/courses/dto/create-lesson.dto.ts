import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(240)
  duration?: number;
}
