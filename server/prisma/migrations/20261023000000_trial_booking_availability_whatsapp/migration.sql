-- Trial booking: confirmed 30-minute appointments on TrialLead, admin-managed
-- availability (weekly rules, one-off windows, blocked periods) and a durable
-- WhatsApp outbox. Existing TrialLead rows are untouched: every new column is
-- nullable or defaulted, so legacy leads simply have no appointment.

-- CreateEnum
CREATE TYPE "TrialAppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrialWhatsAppKind" AS ENUM ('PARENT_CONFIRMATION', 'PARENT_REMINDER', 'ADMIN_ALERT');

-- CreateEnum
CREATE TYPE "TrialWhatsAppStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "TrialLead" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "appointmentStatus" "TrialAppointmentStatus",
ADD COLUMN     "bookedBy" TEXT NOT NULL DEFAULT 'PARENT',
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "parentPhone" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "whatsappConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappConsentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrialAvailabilityRule" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "effectiveFrom" TEXT,
    "effectiveUntil" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialAvailabilityWindow" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialAvailabilityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialBlockedPeriod" (
    "id" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialBlockedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialWhatsAppMessage" (
    "id" TEXT NOT NULL,
    "trialLeadId" TEXT NOT NULL,
    "kind" "TrialWhatsAppKind" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT NOT NULL,
    "status" "TrialWhatsAppStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "nextAttemptAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "errorCode" TEXT,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialWhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrialAvailabilityRule_weekday_idx" ON "TrialAvailabilityRule"("weekday");

-- CreateIndex
CREATE INDEX "TrialAvailabilityWindow_date_idx" ON "TrialAvailabilityWindow"("date");

-- CreateIndex
CREATE INDEX "TrialBlockedPeriod_startDate_endDate_idx" ON "TrialBlockedPeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "TrialWhatsAppMessage_dedupeKey_key" ON "TrialWhatsAppMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "TrialWhatsAppMessage_status_nextAttemptAt_idx" ON "TrialWhatsAppMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "TrialWhatsAppMessage_trialLeadId_idx" ON "TrialWhatsAppMessage"("trialLeadId");

-- CreateIndex
CREATE INDEX "TrialLead_appointmentStatus_startAt_idx" ON "TrialLead"("appointmentStatus", "startAt");

-- CreateIndex
CREATE INDEX "TrialLead_startAt_idx" ON "TrialLead"("startAt");

-- CreateIndex
CREATE INDEX "TrialLead_parentEmail_idx" ON "TrialLead"("parentEmail");

-- AddForeignKey
ALTER TABLE "TrialWhatsAppMessage" ADD CONSTRAINT "TrialWhatsAppMessage_trialLeadId_fkey" FOREIGN KEY ("trialLeadId") REFERENCES "TrialLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Integrity checks Prisma cannot express ─────────────────────────────────

ALTER TABLE "TrialAvailabilityRule"
  ADD CONSTRAINT "TrialAvailabilityRule_valid_range" CHECK (
    "weekday" BETWEEN 0 AND 6
    AND "startMinute" >= 0 AND "endMinute" <= 1440
    AND "endMinute" >= "startMinute" + 30
    AND "startMinute" % 30 = 0 AND "endMinute" % 30 = 0
  );

ALTER TABLE "TrialAvailabilityWindow"
  ADD CONSTRAINT "TrialAvailabilityWindow_valid_range" CHECK (
    "startMinute" >= 0 AND "endMinute" <= 1440
    AND "endMinute" >= "startMinute" + 30
    AND "startMinute" % 30 = 0 AND "endMinute" % 30 = 0
  );

ALTER TABLE "TrialBlockedPeriod"
  ADD CONSTRAINT "TrialBlockedPeriod_valid_range" CHECK (
    "endDate" >= "startDate"
    AND (
      ("startMinute" IS NULL AND "endMinute" IS NULL)
      OR ("startMinute" IS NOT NULL AND "endMinute" IS NOT NULL
          AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute")
    )
  );

-- A booked trial is exactly 30 minutes long and starts on a half-hour mark.
-- Legacy leads (appointmentStatus IS NULL) are exempt.
ALTER TABLE "TrialLead"
  ADD CONSTRAINT "TrialLead_appointment_shape" CHECK (
    "appointmentStatus" IS NULL
    OR (
      "startAt" IS NOT NULL
      AND "endAt" = "startAt" + interval '30 minutes'
      AND (EXTRACT(EPOCH FROM "startAt")::bigint % 1800) = 0
    )
  );

-- Race-safety backstop: two CONFIRMED trials may not start less than 60
-- minutes apart (30-minute session + mandatory 30-minute gap). Each trial
-- claims the half-open range [startAt, startAt + 60 min), so starts exactly
-- 60 minutes apart are allowed and 30 minutes apart are rejected. A
-- cancelled appointment stops holding its range. The application checks the
-- same rule under an advisory lock to return a friendly 409; this constraint
-- guarantees correctness even if that check is ever bypassed.
-- If TRIAL_DURATION/BUFFER ever change, change this interval in a new migration.
ALTER TABLE "TrialLead"
  ADD CONSTRAINT "TrialLead_no_overlapping_slots"
  EXCLUDE USING gist (tsrange("startAt", "startAt" + interval '60 minutes') WITH &&)
  WHERE ("appointmentStatus" = 'CONFIRMED');
