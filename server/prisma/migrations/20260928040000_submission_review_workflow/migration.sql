-- Submission review workflow: replace the old PENDING/REVIEWED status with
-- PENDING/APPROVED/NEEDS_CHANGES, and add rating + predefined feedback tags
-- + a resubmission counter.

-- Swap the enum type (safe pattern for changing/removing enum values in
-- Postgres: build the new type, migrate the column across with a USING
-- clause, then drop the old type and rename).
CREATE TYPE "SubmissionStatus_new" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_CHANGES');

ALTER TABLE "Submission" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Submission"
  ALTER COLUMN "status" TYPE "SubmissionStatus_new"
  USING (
    CASE "status"::text
      WHEN 'REVIEWED' THEN 'APPROVED'
      ELSE "status"::text
    END
  )::"SubmissionStatus_new";

ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "SubmissionStatus";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";

-- AlterTable
ALTER TABLE "Submission"
  ADD COLUMN     "rating" INTEGER,
  ADD COLUMN     "feedbackTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN     "resubmissionCount" INTEGER NOT NULL DEFAULT 0;
