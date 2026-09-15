-- AlterTable: manual bank/bKash payout details + verification/payout locks
ALTER TABLE "TeacherProfile"
  ADD COLUMN "payoutMethod" TEXT,
  ADD COLUMN "bankAccountName" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankBranch" TEXT,
  ADD COLUMN "bkashNumber" TEXT,
  ADD COLUMN "payoutLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "docsLocked" BOOLEAN NOT NULL DEFAULT false;
