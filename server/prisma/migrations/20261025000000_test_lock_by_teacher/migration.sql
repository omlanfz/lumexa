-- Teacher "lock" for live tests.
--
-- During a class the teacher can lock one student's test, or every student's
-- test at once, when time is up: an attempt in progress is auto-submitted with
-- whatever had been saved, and a student who had not started can no longer
-- start. Purely additive (nullable columns, no rewrite of existing rows).

-- AlterTable
ALTER TABLE "AssessmentAttempt" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedByUserId" TEXT;

-- AlterTable
ALTER TABLE "ScheduledLesson" ADD COLUMN     "testLockedAt" TIMESTAMP(3),
ADD COLUMN     "testLockedByUserId" TEXT;
