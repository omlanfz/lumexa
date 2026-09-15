-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('OPEN', 'FINALIZED', 'PAID');

-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'PAUSED';

-- AlterEnum
ALTER TYPE "RescheduleCategory" ADD VALUE 'ADMIN_OVERRIDE';

-- AlterEnum
ALTER TYPE "RescheduleInitiator" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_studentId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "studentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "submittedByStudentId" TEXT,
ALTER COLUMN "submittedByParentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assignedCourseId" TEXT;

-- CreateTable
CREATE TABLE "MonthlyPayoutStatus" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'OPEN',
    "finalizedAmountCents" INTEGER,
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "paidAmountCents" INTEGER,
    "paidBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPayoutStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherStudentNote" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isUserRef" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherStudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyPayoutStatus_month_year_idx" ON "MonthlyPayoutStatus"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPayoutStatus_teacherId_month_year_key" ON "MonthlyPayoutStatus"("teacherId", "month", "year");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherStudentNote_teacherId_studentId_idx" ON "TeacherStudentNote"("teacherId", "studentId");

-- CreateIndex
CREATE INDEX "User_assignedCourseId_idx" ON "User"("assignedCourseId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assignedCourseId_fkey" FOREIGN KEY ("assignedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayoutStatus" ADD CONSTRAINT "MonthlyPayoutStatus_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
