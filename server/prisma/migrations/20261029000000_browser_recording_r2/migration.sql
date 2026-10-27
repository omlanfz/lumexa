-- Class recordings are now made in the teacher's browser (WebM) and uploaded
-- straight to a private Cloudflare R2 bucket with a URL the server signs
-- (RecordingService / RecordingStorageService). LiveKit Egress and the FFmpeg
-- merge job are gone.
--
-- Additive: the new RecordingSegment columns are nullable or defaulted, so every
-- existing segment and every recording already made (ScheduledLesson/Booking
-- recordingUrl) is untouched and keeps working.

-- AlterTable
ALTER TABLE "RecordingSegment"
  ADD COLUMN "recordedByUserId" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "durationSeconds" INTEGER,
  ADD COLUMN "uploadedAt" TIMESTAMP(3),
  ADD COLUMN "uploadAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "RecordingSegment_recordedByUserId_idx" ON "RecordingSegment"("recordedByUserId");

-- Whatever the old recorder still had in flight can never finish now (its
-- Egress webhook and merge job no longer exist). Settle it instead of leaving a
-- class "processing" for ever. Finished recordings (AVAILABLE, with their
-- recordingUrl) are not touched. A segment of the old recorder is exactly one
-- with no recordedByUserId.
UPDATE "RecordingSegment"
SET "status" = 'FAILED',
    "failureReason" = 'Recorded by the retired server-side recorder; it was never finished.'
WHERE "recordedByUserId" IS NULL
  AND "status" IN ('RECORDING', 'UPLOADING');

UPDATE "ScheduledLesson"
SET "recordingStatus" = 'FAILED',
    "recordingMergeError" = 'Recorded by the retired server-side recorder; it was never finished.'
WHERE "recordingStatus" IN ('RECORDING', 'PROCESSING')
  AND "recordingUrl" IS NULL;

UPDATE "Booking"
SET "recordingStatus" = 'FAILED',
    "recordingMergeError" = 'Recorded by the retired server-side recorder; it was never finished.'
WHERE "recordingStatus" IN ('RECORDING', 'PROCESSING')
  AND "recordingUrl" IS NULL;
