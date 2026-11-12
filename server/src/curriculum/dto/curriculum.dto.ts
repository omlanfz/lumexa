// FILE PATH: server/src/curriculum/dto/curriculum.dto.ts

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
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
  // Teacher-only preparation notes (Markdown). Never part of the shared lesson.
  @IsOptional() @IsString() teacherNotes?: string;
  // The lesson's Mini Quiz and visuals. Deeply validated and normalised by
  // validateLessonContent (server/src/curriculum/lesson-content/validate.ts), which
  // rejects the save with a list of what is wrong.
  @IsOptional() @IsArray() miniQuiz?: unknown[];
  @IsOptional() @IsArray() visuals?: unknown[];
}

/** Checks one Mini Quiz answer (learning lessons only — not the assessment system). */
export class QuizCheckDto {
  @IsString() @MaxLength(60) questionId: string;
  @IsObject() answer: Record<string, unknown>;
  /** A student must say which of their own classes they are reading the lesson through. */
  @IsOptional() @IsString() @MaxLength(64) scheduledLessonId?: string;
  /** The classroom's own request (see CurriculumService.isAttendingNow). */
  @IsOptional() @IsBoolean() inClassroom?: boolean;
}

/** A student's study progress: what they have actually read / done. */
export class SaveProgressDto {
  @IsOptional() @IsArray() @ArrayMaxSize(80) @IsString({ each: true }) @MaxLength(60, { each: true }) sectionsRead?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(80) @IsString({ each: true }) @MaxLength(60, { each: true }) activitiesDone?: string[];
  @IsOptional() @IsBoolean() inClassroom?: boolean;
}

/** A draft lesson to preview exactly as learners / the teacher's presentation would see it. */
export class PreviewLessonDto {
  @IsOptional() @IsString() @MaxLength(64) lessonId?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) objectives?: string[];
  @IsOptional() @IsString() contentMarkdown?: string;
  @IsOptional() @IsString() homework?: string;
  @IsOptional() @IsString() teacherNotes?: string;
  @IsOptional() @IsString() checkpoint?: string;
  @IsOptional() @IsArray() miniQuiz?: unknown[];
  @IsOptional() @IsArray() visuals?: unknown[];
  @IsOptional() @IsArray() projectLinks?: ProjectLinkDto[];
  @IsOptional() @IsArray() codeSnippets?: CodeSnippetDto[];
  // Little Coders: the draft's interactive page, video record and cards (deeply validated by the
  // Little Coders validators; omitted = what the lesson already has).
  @IsOptional() @IsObject() experience?: Record<string, unknown>;
  @IsOptional() @IsObject() previewVideo?: Record<string, unknown>;
  @IsOptional() @IsObject() projectCard?: Record<string, unknown>;
  @IsOptional() @IsObject() homeworkCard?: Record<string, unknown>;
}

/**
 * Little Coders: the four stored documents of a redesigned lesson — its interactive page
 * (experience), "Your Learning Preview" video record, project card and homework card. Each is
 * validated in full by the Little Coders validators; a save with problems is rejected with the list.
 */
export class UpdateLcLessonDto {
  @IsOptional() @IsObject() experience?: Record<string, unknown>;
  @IsOptional() @IsObject() previewVideo?: Record<string, unknown>;
  @IsOptional() @IsObject() projectCard?: Record<string, unknown>;
  @IsOptional() @IsObject() homeworkCard?: Record<string, unknown>;
}

/** Little Coders: where a platform's "Start Coding" button opens (or switch the platform off). */
export class UpdateCodingPlatformDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(500) startUrl?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// A question is either a four-option MCQ or a True/False statement (options
// are then always ["True", "False"]). The service enforces the shape; the DTO
// only bounds the sizes.
export class CreateMCQQuestionDto {
  @IsOptional() @IsIn(['MCQ', 'TRUE_FALSE']) questionType?:
    | 'MCQ'
    | 'TRUE_FALSE';
  @IsString() @MaxLength(1500) questionText: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];
  @IsInt() @Min(0) @Max(3) correctIndex: number;
  @IsOptional() @IsString() @MaxLength(1500) explanation?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdateMCQQuestionDto {
  @IsOptional() @IsIn(['MCQ', 'TRUE_FALSE']) questionType?:
    | 'MCQ'
    | 'TRUE_FALSE';
  @IsOptional() @IsString() @MaxLength(1500) questionText?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(3) correctIndex?: number;
  @IsOptional() @IsString() @MaxLength(1500) explanation?: string;
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
  // Little Coders Final Assessment: the practical-project version students are given.
  @IsOptional() @IsIn(['SCRATCH_AI', 'PYTHON']) activeVariant?: string;
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
  // Little Coders: the structured project (brief, blocks, requirements, starter project).
  @IsOptional() spec?: Record<string, unknown>;
  @IsOptional() @IsIn(['SCRATCH_AI', 'PYTHON']) variantKey?: string;
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
  @IsOptional() spec?: Record<string, unknown>;
  @IsOptional() @IsIn(['SCRATCH_AI', 'PYTHON']) variantKey?: string;
}
