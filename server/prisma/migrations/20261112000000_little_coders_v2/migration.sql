-- Little Coders v2 — purely additive (nothing is dropped, renamed or rewritten):
--   * Lesson: four optional JSONB columns for the interactive Little Coders lesson
--     (experience, previewVideo, projectCard, homeworkCard). Null for every other program.
--   * Assessment.format (default STANDARD, so every existing and every other program's test
--     is unchanged) and Assessment.activeVariant; PracticalQuestion.spec / variantKey;
--     PracticalSubmission.links / note; ScheduledLesson.practicalVariant.
--   * AssessmentFile: temporary R2 records for assessment practical files.
--   * CodingPlatform: admin-managed "Start Coding" addresses.
-- The curriculum itself is restructured by the boot-time Little Coders migration
-- (server/src/little-coders/migrate), which preserves all student history.

-- CreateEnum
CREATE TYPE "AssessmentFormat" AS ENUM ('STANDARD', 'LITTLE_CODERS_V2');

-- CreateEnum
CREATE TYPE "AssessmentFileStatus" AS ENUM ('UPLOADED', 'ATTACHED', 'DELETE_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "AssessmentFileDeleteReason" AS ENUM ('REVIEW_FINALISED', 'REMOVED_BY_STUDENT', 'ORPHANED');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "activeVariant" TEXT,
ADD COLUMN     "format" "AssessmentFormat" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "experience" JSONB,
ADD COLUMN     "homeworkCard" JSONB,
ADD COLUMN     "previewVideo" JSONB,
ADD COLUMN     "projectCard" JSONB;

-- AlterTable
ALTER TABLE "PracticalQuestion" ADD COLUMN     "spec" JSONB,
ADD COLUMN     "variantKey" TEXT;

-- AlterTable
ALTER TABLE "PracticalSubmission" ADD COLUMN     "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "ScheduledLesson" ADD COLUMN     "practicalVariant" TEXT;

-- CreateTable
CREATE TABLE "AssessmentFile" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "programKey" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "AssessmentFileStatus" NOT NULL DEFAULT 'UPLOADED',
    "deleteReason" "AssessmentFileDeleteReason",
    "deleteAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDeleteError" TEXT,
    "lastDeleteAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedAt" TIMESTAMP(3),
    "deleteRequestedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "AssessmentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingPlatform" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startUrl" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CodingPlatform_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentFile_objectKey_key" ON "AssessmentFile"("objectKey");

-- CreateIndex
CREATE INDEX "AssessmentFile_attemptId_idx" ON "AssessmentFile"("attemptId");

-- CreateIndex
CREATE INDEX "AssessmentFile_studentUserId_idx" ON "AssessmentFile"("studentUserId");

-- CreateIndex
CREATE INDEX "AssessmentFile_status_createdAt_idx" ON "AssessmentFile"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentFile_status_lastDeleteAttemptAt_idx" ON "AssessmentFile"("status", "lastDeleteAttemptAt");

-- AddForeignKey
ALTER TABLE "AssessmentFile" ADD CONSTRAINT "AssessmentFile_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
