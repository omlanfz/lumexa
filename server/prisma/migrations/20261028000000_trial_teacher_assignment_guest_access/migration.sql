-- Trial classes: teacher assignment, secure guest classroom access and the
-- one-hour reminder. Additive only — every new column is nullable, so existing
-- leads and appointments are untouched. A trial still has no student account,
-- no ScheduledLesson and no ledger/curriculum rows.

-- AlterEnum (the new values are not used in this migration)
ALTER TYPE "TrialAppointmentStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "TrialAppointmentStatus" ADD VALUE 'MISSED';
ALTER TYPE "TrialWhatsAppKind" ADD VALUE 'PARENT_CLASS_DETAILS';

-- AlterTable
ALTER TABLE "TrialLead"
  ADD COLUMN "guestToken" TEXT,
  ADD COLUMN "teacherId" TEXT,
  ADD COLUMN "teacherAssignedAt" TIMESTAMP(3),
  ADD COLUMN "teacherJoinedAt" TIMESTAMP(3),
  ADD COLUMN "guestJoinedAt" TIMESTAMP(3),
  ADD COLUMN "reminderDueAt" TIMESTAMP(3),
  ADD COLUMN "reminderEmailSentAt" TIMESTAMP(3);

-- Every already-booked appointment gets its own unguessable join token now,
-- so assigning a teacher later never needs to mint one. (Two random UUIDs =
-- 64 hex characters from Postgres' cryptographic generator.)
UPDATE "TrialLead"
SET "guestToken" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE "appointmentStatus" IS NOT NULL AND "guestToken" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TrialLead_guestToken_key" ON "TrialLead"("guestToken");
CREATE INDEX "TrialLead_teacherId_startAt_idx" ON "TrialLead"("teacherId", "startAt");
CREATE INDEX "TrialLead_reminderDueAt_idx" ON "TrialLead"("reminderDueAt");

-- AddForeignKey (a deleted teacher profile simply unassigns the trial)
ALTER TABLE "TrialLead" ADD CONSTRAINT "TrialLead_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
