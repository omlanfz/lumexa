-- CreateEnum
CREATE TYPE "StudentLedgerEntryType" AS ENUM ('PAYMENT_RECEIVED', 'LESSON_COMPLETED', 'CURRICULUM_CHANGE', 'CREDIT_CARRIED_FORWARD', 'REFUND', 'ADMIN_ADJUSTMENT');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "priceCents" INTEGER;

-- CreateTable
CREATE TABLE "StudentLedgerEntry" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "type" "StudentLedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "rateCents" INTEGER NOT NULL,
    "lessonsPurchased" DOUBLE PRECISION,
    "courseId" TEXT,
    "courseName" TEXT NOT NULL,
    "description" TEXT,
    "createdByAdminId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentLedgerEntry_studentUserId_createdAt_idx" ON "StudentLedgerEntry"("studentUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLedgerEntry_bookingId_type_key" ON "StudentLedgerEntry"("bookingId", "type");

-- AddForeignKey
ALTER TABLE "StudentLedgerEntry" ADD CONSTRAINT "StudentLedgerEntry_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLedgerEntry" ADD CONSTRAINT "StudentLedgerEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLedgerEntry" ADD CONSTRAINT "StudentLedgerEntry_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLedgerEntry" ADD CONSTRAINT "StudentLedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
