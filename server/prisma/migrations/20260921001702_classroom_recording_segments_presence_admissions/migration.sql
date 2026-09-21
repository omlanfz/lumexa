-- CreateEnum
CREATE TYPE "RecordingSegmentStatus" AS ENUM ('RECORDING', 'UPLOADING', 'AVAILABLE', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClassEndReason" AS ENUM ('STUDENT_NO_SHOW', 'STUDENT_LEFT_EARLY', 'TECHNICAL_ISSUE', 'TEACHER_DISCONNECTED', 'OTHER');

-- CreateEnum
CREATE TYPE "ClassroomAdmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'REMOVED');

-- AlterEnum
ALTER TYPE "RecordingStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "endNote" TEXT,
ADD COLUMN     "endReason" "ClassEndReason",
ADD COLUMN     "recordingFileSizeBytes" INTEGER,
ADD COLUMN     "recordingMergeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordingMergeError" TEXT,
ADD COLUMN     "recordingMergedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ScheduledLesson" ADD COLUMN     "endNote" TEXT,
ADD COLUMN     "endReason" "ClassEndReason",
ADD COLUMN     "recordingFileSizeBytes" INTEGER,
ADD COLUMN     "recordingMergeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recordingMergeError" TEXT,
ADD COLUMN     "recordingMergedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecordingSegment" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "bookingId" TEXT,
    "scheduledLessonId" TEXT,
    "egressId" TEXT,
    "status" "RecordingSegmentStatus" NOT NULL DEFAULT 'RECORDING',
    "storagePath" TEXT,
    "fileSizeBytes" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordingSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomPresence" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAdmission" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "ClassroomAdmissionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordingSegment_room_idx" ON "RecordingSegment"("room");

-- CreateIndex
CREATE INDEX "RecordingSegment_bookingId_idx" ON "RecordingSegment"("bookingId");

-- CreateIndex
CREATE INDEX "RecordingSegment_scheduledLessonId_idx" ON "RecordingSegment"("scheduledLessonId");

-- CreateIndex
CREATE INDEX "RecordingSegment_status_idx" ON "RecordingSegment"("status");

-- CreateIndex
CREATE INDEX "RecordingSegment_egressId_idx" ON "RecordingSegment"("egressId");

-- CreateIndex
CREATE INDEX "ClassroomPresence_room_idx" ON "ClassroomPresence"("room");

-- CreateIndex
CREATE INDEX "ClassroomPresence_disconnectedAt_idx" ON "ClassroomPresence"("disconnectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomPresence_room_userId_key" ON "ClassroomPresence"("room", "userId");

-- CreateIndex
CREATE INDEX "ClassroomAdmission_room_userId_createdAt_idx" ON "ClassroomAdmission"("room", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassroomAdmission_room_status_idx" ON "ClassroomAdmission"("room", "status");

-- AddForeignKey
ALTER TABLE "RecordingSegment" ADD CONSTRAINT "RecordingSegment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingSegment" ADD CONSTRAINT "RecordingSegment_scheduledLessonId_fkey" FOREIGN KEY ("scheduledLessonId") REFERENCES "ScheduledLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
