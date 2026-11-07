-- Certificates of Completion: admin-approved issuance, permanent R2 storage and a
-- replacement chain, on top of the table the previous (auto-issuing) system used.
--
-- Certificates issued by the previous system are KEPT and migrated in place:
--   • certificateNumber (LMX-…)  -> certificateId   (same value, same unique index)
--   • courseName                 -> programName
--   • their Cloudinary link stays in pdfUrl; theme/templateVersion = 'legacy'
--   • the name printed is backfilled from the student's account, the completion
--     date from the issue date (Asia/Dhaka calendar day)
--   • each gets an ISSUED CertificateReview, so the new completion trigger can
--     never open a second review for a programme that was already certified
--   • emailStatus = SKIPPED: the previous system already emailed them, and the
--     new email retry must never send them a second congratulation
-- Nothing is dropped or rewritten except the two column names.

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ACTIVE', 'REVOKED', 'REPLACED');

-- CreateEnum
CREATE TYPE "CertificateReviewStatus" AS ENUM ('PENDING', 'PROCESSING', 'ISSUED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CertificateEmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- Data-preserving renames (Prisma's own diff would DROP and re-ADD these)
ALTER TABLE "Certificate" RENAME COLUMN "certificateNumber" TO "certificateId";
ALTER INDEX "Certificate_certificateNumber_key" RENAME TO "Certificate_certificateId_key";
ALTER TABLE "Certificate" RENAME COLUMN "courseName" TO "programName";

-- A replacement is a second row for the same student and programme.
DROP INDEX "Certificate_studentUserId_courseId_key";

-- New columns. The four that must be NOT NULL are added nullable, backfilled for
-- the rows that already exist, and tightened below.
ALTER TABLE "Certificate"
  ADD COLUMN "status" "CertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "reviewId" TEXT,
  ADD COLUMN "recipientName" TEXT,
  ADD COLUMN "completionDate" TEXT,
  ADD COLUMN "withDistinction" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "theme" TEXT,
  ADD COLUMN "themeSnapshot" JSONB,
  ADD COLUMN "templateVersion" TEXT,
  ADD COLUMN "storageBucket" TEXT,
  ADD COLUMN "pdfKey" TEXT,
  ADD COLUMN "pngKey" TEXT,
  ADD COLUMN "pdfBytes" INTEGER,
  ADD COLUMN "pngBytes" INTEGER,
  ADD COLUMN "pdfSha256" TEXT,
  ADD COLUMN "pngSha256" TEXT,
  ADD COLUMN "issuedByAdminId" TEXT,
  ADD COLUMN "replacesCertificateId" TEXT,
  ADD COLUMN "replacedByCertificateId" TEXT,
  ADD COLUMN "replacedAt" TIMESTAMP(3),
  ADD COLUMN "replacedByAdminId" TEXT,
  ADD COLUMN "replacementReason" TEXT,
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedByAdminId" TEXT,
  ADD COLUMN "revocationReason" TEXT,
  ADD COLUMN "emailStatus" "CertificateEmailStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "emailLastError" TEXT,
  ADD COLUMN "emailSentAt" TIMESTAMP(3),
  ADD COLUMN "emailSendingSince" TIMESTAMP(3),
  ADD COLUMN "emailRecipient" TEXT,
  ADD COLUMN "emailLogId" TEXT,
  ADD COLUMN "achievementSeenAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "pdfUrl" DROP NOT NULL;

-- Backfill what the previous system never stored.
UPDATE "Certificate" c
SET "recipientName" = COALESCE(
      (SELECT u."fullName" FROM "User" u WHERE u."id" = c."studentUserId"),
      'Lumexa student'
    ),
    "completionDate" = to_char((c."issuedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD'),
    "theme" = 'legacy',
    "templateVersion" = 'legacy',
    "emailStatus" = 'SKIPPED',
    "emailLastError" = 'Issued by the previous certificate system, which emailed it.';

ALTER TABLE "Certificate"
  ALTER COLUMN "recipientName" SET NOT NULL,
  ALTER COLUMN "completionDate" SET NOT NULL,
  ALTER COLUMN "theme" SET NOT NULL,
  ALTER COLUMN "templateVersion" SET NOT NULL,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CertificateReview" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "CertificateReviewStatus" NOT NULL DEFAULT 'PENDING',
    "finalClassId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "suggestedCompletionDate" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "processingStartedAt" TIMESTAMP(3),
    "processingByAdminId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByAdminId" TEXT,
    "dismissReason" TEXT,
    "issuedCertificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateReview_issuedCertificateId_key" ON "CertificateReview"("issuedCertificateId");

-- CreateIndex
CREATE INDEX "CertificateReview_status_createdAt_idx" ON "CertificateReview"("status", "createdAt");

-- CreateIndex: the pending review is created ONCE per student and programme,
-- however often the completion event fires.
CREATE UNIQUE INDEX "CertificateReview_studentUserId_courseId_key" ON "CertificateReview"("studentUserId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_reviewId_key" ON "Certificate"("reviewId");

-- CreateIndex: file keys are unique, so no two certificates can ever share (and
-- so overwrite) an object.
CREATE UNIQUE INDEX "Certificate_pdfKey_key" ON "Certificate"("pdfKey");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_pngKey_key" ON "Certificate"("pngKey");

-- CreateIndex: a certificate can be replaced only once.
CREATE UNIQUE INDEX "Certificate_replacedByCertificateId_key" ON "Certificate"("replacedByCertificateId");

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "Certificate_status_issuedAt_idx" ON "Certificate"("status", "issuedAt");

-- A student holds ONE active certificate per programme (replaced and revoked
-- ones are history). Prisma cannot express a partial unique index, so this lives
-- in SQL only — like the partial index on ScheduledLesson.
CREATE UNIQUE INDEX "Certificate_one_active_per_program"
  ON "Certificate" ("studentUserId", "courseId")
  WHERE "status" = 'ACTIVE';

-- Integrity the application also enforces, kept in the database so no code path
-- can write an inconsistent certificate.
ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_completionDate_format"
    CHECK ("completionDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  ADD CONSTRAINT "Certificate_revoked_has_timestamp"
    CHECK ("status" <> 'REVOKED' OR "revokedAt" IS NOT NULL),
  ADD CONSTRAINT "Certificate_replaced_has_successor"
    CHECK ("status" <> 'REPLACED' OR ("replacedAt" IS NOT NULL AND "replacedByCertificateId" IS NOT NULL)),
  -- A certificate is never recorded as issued unless BOTH its files were stored.
  ADD CONSTRAINT "Certificate_issued_has_files"
    CHECK ("templateVersion" = 'legacy' OR ("pdfKey" IS NOT NULL AND "pngKey" IS NOT NULL AND "storageBucket" IS NOT NULL));

ALTER TABLE "CertificateReview"
  ADD CONSTRAINT "CertificateReview_suggestedCompletionDate_format"
    CHECK ("suggestedCompletionDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  ADD CONSTRAINT "CertificateReview_issued_has_certificate"
    CHECK ("status" <> 'ISSUED' OR "issuedCertificateId" IS NOT NULL);

-- Every certificate the previous system issued closes its own review.
INSERT INTO "CertificateReview" (
  "id", "studentUserId", "courseId", "status", "finalClassId", "completedAt",
  "suggestedCompletionDate", "source", "decidedAt", "issuedCertificateId", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, c."studentUserId", c."courseId", 'ISSUED', NULL, c."issuedAt",
       c."completionDate", 'LEGACY', c."issuedAt", c."id", c."issuedAt", CURRENT_TIMESTAMP
FROM "Certificate" c;

UPDATE "Certificate" c
SET "reviewId" = r."id"
FROM "CertificateReview" r
WHERE r."issuedCertificateId" = c."id";
