-- CreateEnum
CREATE TYPE "RescheduleAction" AS ENUM ('RESCHEDULE', 'CANCEL');

-- CreateEnum
CREATE TYPE "RescheduleCategory" AS ENUM ('STUDENT_REQUESTED', 'TEACHER_EMERGENCY', 'NO_SHOW', 'MISUSE');

-- CreateEnum
CREATE TYPE "RescheduleInitiator" AS ENUM ('STUDENT', 'PARENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "PenaltyStatus" AS ENUM ('NONE', 'PENDING_PENALTY_REVIEW', 'PENALTY_APPLIED', 'WAIVED');

-- CreateEnum
CREATE TYPE "PayoutEntryType" AS ENUM ('CLASS_COMPLETED', 'PTM', 'CONVERSION', 'PENALTY', 'ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "RescheduleRequest" DROP CONSTRAINT "RescheduleRequest_bookingId_fkey";

-- DropIndex
DROP INDEX "RescheduleRequest_bookingId_key";

-- AlterTable RescheduleRequest: turn the unused pending-request row into a
-- permanent per-event audit record (see model doc comment in schema.prisma).
ALTER TABLE "RescheduleRequest"
  DROP COLUMN "requestedBy",
  ADD COLUMN "teacherId" TEXT NOT NULL,
  ADD COLUMN "action" "RescheduleAction" NOT NULL DEFAULT 'RESCHEDULE',
  ADD COLUMN "category" "RescheduleCategory" NOT NULL,
  ADD COLUMN "initiatedByRole" "RescheduleInitiator" NOT NULL,
  ADD COLUMN "oldStart" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "oldEnd" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "proofUrl" TEXT,
  ADD COLUMN "informedStudent" BOOLEAN,
  ADD COLUMN "penaltyStatus" "PenaltyStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "penaltyAmountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "emergencySeq" INTEGER,
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "RescheduleRequest" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "RescheduleRequest_bookingId_idx" ON "RescheduleRequest"("bookingId");

-- CreateIndex
CREATE INDEX "RescheduleRequest_teacherId_category_createdAt_idx" ON "RescheduleRequest"("teacherId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PayoutEntry" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" "PayoutEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "bookingId" TEXT,
    "description" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "PayoutEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutEntry_teacherId_month_year_idx" ON "PayoutEntry"("teacherId", "month", "year");

-- CreateIndex
CREATE INDEX "PayoutEntry_teacherId_createdAt_idx" ON "PayoutEntry"("teacherId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutEntry_referenceType_referenceId_type_key" ON "PayoutEntry"("referenceType", "referenceId", "type");

-- AddForeignKey
ALTER TABLE "PayoutEntry" ADD CONSTRAINT "PayoutEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutEntry" ADD CONSTRAINT "PayoutEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
