-- Homework files now live in their own PRIVATE Cloudflare R2 bucket
-- (HOMEWORK_R2_BUCKET — not the class-recordings bucket). Each file is one
-- HomeworkFile row: who it belongs to, its object key, and whether it is still
-- needed. A file is kept until its submission has been reviewed, then removed
-- from R2 while the submission, grade and feedback stay.
--
-- Additive: a new table and two enums. Submission.files (the Cloudinary-era
-- list of links) is untouched, so every earlier submission keeps working.

-- CreateEnum
CREATE TYPE "HomeworkFileStatus" AS ENUM ('UPLOADED', 'ATTACHED', 'DELETE_PENDING', 'DELETED');

-- CreateEnum
CREATE TYPE "HomeworkFileDeleteReason" AS ENUM ('REVIEWED', 'REPLACED', 'ABANDONED', 'ORPHANED');

-- CreateTable
CREATE TABLE "HomeworkFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "studentUserId" TEXT NOT NULL,
    "scheduledLessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "HomeworkFileStatus" NOT NULL DEFAULT 'UPLOADED',
    "deleteReason" "HomeworkFileDeleteReason",
    "deleteAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastDeleteError" TEXT,
    "lastDeleteAttemptAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedAt" TIMESTAMP(3),
    "deleteRequestedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkFile_objectKey_key" ON "HomeworkFile"("objectKey");

-- CreateIndex
CREATE INDEX "HomeworkFile_submissionId_idx" ON "HomeworkFile"("submissionId");

-- CreateIndex
CREATE INDEX "HomeworkFile_studentUserId_scheduledLessonId_idx" ON "HomeworkFile"("studentUserId", "scheduledLessonId");

-- CreateIndex
CREATE INDEX "HomeworkFile_status_createdAt_idx" ON "HomeworkFile"("status", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkFile_status_lastDeleteAttemptAt_idx" ON "HomeworkFile"("status", "lastDeleteAttemptAt");

-- AddForeignKey
ALTER TABLE "HomeworkFile" ADD CONSTRAINT "HomeworkFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
