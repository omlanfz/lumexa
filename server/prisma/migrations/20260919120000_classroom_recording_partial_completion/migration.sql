-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('NONE', 'RECORDING', 'PROCESSING', 'AVAILABLE', 'FAILED');

-- AlterEnum
ALTER TYPE "LessonStatus" ADD VALUE 'PARTIALLY_COMPLETED';

-- AlterTable (bring the legacy Booking flow's recording fields up to the
-- same lifecycle tracking as ScheduledLesson, since both share one
-- teacher-triggered Record button/pipeline)
ALTER TABLE "Booking"
  ADD COLUMN "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recordingStartedAt" TIMESTAMP(3);

-- Backfill: reflect the state pre-existing rows are already actually in.
UPDATE "Booking" SET "recordingStatus" = 'AVAILABLE' WHERE "recordingUrl" IS NOT NULL;
UPDATE "Booking" SET "recordingStatus" = 'PROCESSING' WHERE "recordingUrl" IS NULL AND "egressId" IS NOT NULL;

-- AlterTable
ALTER TABLE "ScheduledLesson"
  ADD COLUMN "egressId" TEXT,
  ADD COLUMN "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "recordingUrl" TEXT,
  ADD COLUMN "recordingStartedAt" TIMESTAMP(3),
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "endedByRole" TEXT;

-- DropIndex
DROP INDEX "ScheduledLesson_studentUserId_courseId_lessonNumber_key";

-- CreateIndex (plain — for query planning only)
CREATE INDEX "ScheduledLesson_studentUserId_courseId_lessonNumber_idx" ON "ScheduledLesson"("studentUserId", "courseId", "lessonNumber");

-- CreateIndex (the REAL uniqueness constraint — partial, so a
-- partial-completion redo occurrence can reuse the lessonNumber of the
-- PARTIALLY_COMPLETED row it is redoing without a collision; only one
-- UPCOMING or COMPLETED row may ever occupy a given lessonNumber slot).
CREATE UNIQUE INDEX "ScheduledLesson_active_lessonNumber_key"
  ON "ScheduledLesson"("studentUserId", "courseId", "lessonNumber")
  WHERE "status" IN ('UPCOMING', 'COMPLETED');

-- CreateTable
CREATE TABLE "DashboardAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardAlert_userId_createdAt_idx" ON "DashboardAlert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DashboardAlert_userId_read_idx" ON "DashboardAlert"("userId", "read");
