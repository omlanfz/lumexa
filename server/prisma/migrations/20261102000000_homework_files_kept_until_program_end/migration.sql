-- Homework files are no longer removed when the teacher reviews the submission.
-- They stay in the private homework R2 bucket until the student has finished the
-- program (curriculum) they were submitted for, and are removed then. This adds
-- the reason recorded on a file removed that way; REVIEWED stays, because earlier
-- files were removed for it and their history must keep reading correctly.
--
-- Purely additive: one enum value, no table changes.

-- AlterEnum
ALTER TYPE "HomeworkFileDeleteReason" ADD VALUE 'PROGRAM_COMPLETED';
