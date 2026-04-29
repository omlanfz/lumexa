import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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

  @IsInt()
  @Min(4)
  @Max(18)
  ageMin: number;

  @IsInt()
  @Min(4)
  @Max(18)
  ageMax: number;

  @IsInt()
  @Min(1)
  @Max(100)
  sessions: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  gemCost?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
