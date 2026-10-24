-- Assessment report cards, standardized question banks, and linked banks for
-- custom curricula.
--
--  * QuestionKind + MCQQuestion.questionType: True/False questions alongside
--    four-option MCQs.
--  * MCQQuestion/PracticalQuestion.bankKey (+ unique per assessment) and
--    MCQQuestion.editedByAdmin: identity for the idempotent, admin-safe bank
--    sync (server/src/assessments/bank) — questions are updated in place, never
--    duplicated, and an admin's edit is never overwritten.
--  * Assessment.sourceAssessmentId: a custom curriculum's imported test lesson
--    reuses the ORIGINAL assessment's questions instead of copying them.
--  * TestReport: the Test Evaluation report card generated when a student
--    submits (auto-graded objective part, teacher review, parent sharing).
--
-- Purely additive DDL: no column is dropped or retyped, so every existing
-- assessment, question, attempt and answer row stays valid as-is.

-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MCQ', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "TestReportStatus" AS ENUM ('PENDING_REVIEW', 'PENDING_CODE_EVALUATION', 'READY_TO_SHARE', 'SHARED_WITH_PARENTS');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "bankVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceAssessmentId" TEXT;

-- AlterTable
ALTER TABLE "MCQQuestion" ADD COLUMN     "bankKey" TEXT,
ADD COLUMN     "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questionType" "QuestionKind" NOT NULL DEFAULT 'MCQ';

-- AlterTable
ALTER TABLE "PracticalQuestion" ADD COLUMN     "bankKey" TEXT;

-- CreateTable
CREATE TABLE "TestReport" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "lessonId" TEXT,
    "scheduledLessonId" TEXT,
    "assessmentType" "SessionType" NOT NULL,
    "testTitle" TEXT NOT NULL,
    "status" "TestReportStatus" NOT NULL,
    "passScorePct" INTEGER NOT NULL,
    "mcqTotal" INTEGER NOT NULL,
    "trueFalseTotal" INTEGER NOT NULL,
    "autoObjectiveScore" DOUBLE PRECISION NOT NULL,
    "objectiveScore" DOUBLE PRECISION NOT NULL,
    "objectiveMaxScore" DOUBLE PRECISION NOT NULL,
    "questionResults" JSONB NOT NULL,
    "hasCodingProject" BOOLEAN NOT NULL DEFAULT false,
    "codingProject" JSONB,
    "codingMaxScore" DOUBLE PRECISION,
    "codingRubricScores" JSONB,
    "codingScore" DOUBLE PRECISION,
    "codingFeedback" TEXT,
    "codingEvaluatedAt" TIMESTAMP(3),
    "totalMaxScore" DOUBLE PRECISION NOT NULL,
    "totalScore" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "feedback" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "teacherEdited" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3),
    "lastEditedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "sharedAt" TIMESTAMP(3),
    "sharedByUserId" TEXT,
    "sharedToEmail" TEXT,
    "shareRecipientKind" TEXT,
    "shareEmailLogId" TEXT,
    "shareAttempts" INTEGER NOT NULL DEFAULT 0,
    "shareStartedAt" TIMESTAMP(3),
    "lastShareError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestReport_attemptId_key" ON "TestReport"("attemptId");

-- CreateIndex
CREATE INDEX "TestReport_teacherId_status_idx" ON "TestReport"("teacherId", "status");

-- CreateIndex
CREATE INDEX "TestReport_studentUserId_idx" ON "TestReport"("studentUserId");

-- CreateIndex
CREATE INDEX "TestReport_status_createdAt_idx" ON "TestReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Assessment_sourceAssessmentId_idx" ON "Assessment"("sourceAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MCQQuestion_assessmentId_bankKey_key" ON "MCQQuestion"("assessmentId", "bankKey");

-- CreateIndex
CREATE UNIQUE INDEX "PracticalQuestion_assessmentId_bankKey_key" ON "PracticalQuestion"("assessmentId", "bankKey");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_sourceAssessmentId_fkey" FOREIGN KEY ("sourceAssessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Data backfill: custom-curriculum test sessions imported WITHOUT a bank ──
--
-- Root cause of "the Course Test in my custom course shows no questions":
-- CurriculumService.importLesson(s) copied a default curriculum's test session
-- as a plain Lesson but never created/linked its Assessment, so the lesson
-- had no question bank at all. Every such lesson (a non-LEARNING lesson in a
-- custom course whose sourceRefs.importedFromLessonId points at a lesson that
-- has an Assessment, and which has no Assessment of its own) now gets its own
-- Assessment row LINKED to the original bank (sourceAssessmentId, flattened to
-- the root bank if the source was itself linked). No question is copied.
--
-- Idempotent: the NOT EXISTS guard (and the unique Assessment.lessonId) mean a
-- re-run inserts nothing, and a lesson that already has an assessment is never
-- touched.
INSERT INTO "Assessment" (
  "id", "lessonId", "type", "title", "instructions", "mcqCount",
  "randomizeQuestions", "randomizeOptions", "passScorePct", "vivaMaxScore",
  "isPublished", "sourceAssessmentId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  l."id",
  l."type",
  src_a."title",
  src_a."instructions",
  src_a."mcqCount",
  src_a."randomizeQuestions",
  src_a."randomizeOptions",
  src_a."passScorePct",
  src_a."vivaMaxScore",
  src_a."isPublished",
  COALESCE(src_a."sourceAssessmentId", src_a."id"),
  NOW(),
  NOW()
FROM "Lesson" l
JOIN "Course" c ON c."id" = l."courseId" AND c."isCustom" = true
JOIN "Lesson" src_l ON src_l."id" = (l."sourceRefs" ->> 'importedFromLessonId')
JOIN "Assessment" src_a ON src_a."lessonId" = src_l."id"
WHERE l."type" <> 'LEARNING'
  AND jsonb_typeof(l."sourceRefs") = 'object'
  AND NOT EXISTS (SELECT 1 FROM "Assessment" own WHERE own."lessonId" = l."id");
