// FILE PATH: server/src/curriculum/dto/curriculum.dto.ts

import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @MaxLength(80)
  slug: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  stageNumber?: number;
}

export class UpdateModuleDto {
  @IsOptional() @IsString() @MaxLength(150) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsInt() @Min(1) order?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3) stageNumber?: number;
}

export class CreateProjectDto {
  @IsString()
  @MaxLength(80)
  slug: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(1)
  order: number;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(150) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsInt() @Min(1) order?: number;
}

class CodeSnippetDto {
  @IsString() label: string;
  @IsString() language: string;
  @IsString() code: string;
  @IsOptional() @IsString() part?: string;
}

class ProjectLinkDto {
  @IsString() @MaxLength(150) title: string;
  @IsString() @MaxLength(2000) url: string;
}

export class UpdateLessonContentDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsInt() @Min(1) order?: number;
  @IsOptional() @IsInt() @Min(10) @Max(240) duration?: number;
  @IsOptional()
  @IsIn(['LEARNING', 'COURSE_TEST', 'STAGE_TEST', 'FINAL_TEST'])
  type?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
  @IsOptional() @IsString() contentMarkdown?: string;
  @IsOptional() @IsString() reviewNotes?: string;
  @IsOptional() @IsString() homework?: string;
  @IsOptional() @IsString() checkpoint?: string;
  @IsOptional() @IsArray() codeSnippets?: CodeSnippetDto[];
  // Buttons shown in the lesson page's "Project" section, replacing the
  // Code section when non-empty — see Lesson.projectLinks in schema.prisma.
  @IsOptional() @IsArray() projectLinks?: ProjectLinkDto[];
}

export class CreateMCQQuestionDto {
  @IsString() questionText: string;
  @IsArray() @IsString({ each: true }) options: string[];
  @IsInt() @Min(0) correctIndex: number;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateMCQQuestionDto {
  @IsOptional() @IsString() questionText?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsOptional() @IsInt() @Min(0) correctIndex?: number;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateAssessmentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsInt() @Min(1) mcqCount?: number;
  @IsOptional() @IsBoolean() randomizeQuestions?: boolean;
  @IsOptional() @IsBoolean() randomizeOptions?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(100) passScorePct?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsNumber() vivaMaxScore?: number;
}

export class CreatePracticalQuestionDto {
  @IsString() title: string;
  @IsString() instructions: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() starterCode?: string;
  @IsOptional() testCases?: {
    name: string;
    input: unknown[];
    expectedOutput: unknown;
  }[];
  @IsOptional() rubric?: { criterion: string; maxPoints: number }[];
  @IsOptional() @IsInt() maxScore?: number;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class ImportLessonDto {
  @IsString()
  sourceLessonId: string;

  @IsInt()
  @Min(1)
  order: number;
}

export class ImportLessonsDto {
  @IsArray()
  @IsString({ each: true })
  sourceLessonIds: string[];
}

export class UpdatePracticalQuestionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() starterCode?: string;
  @IsOptional() testCases?: {
    name: string;
    input: unknown[];
    expectedOutput: unknown;
  }[];
  @IsOptional() rubric?: { criterion: string; maxPoints: number }[];
  @IsOptional() @IsInt() maxScore?: number;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
