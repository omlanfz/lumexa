-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'REVIEWED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "curriculumPdfUrl" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudentLedgerEntry" ADD COLUMN     "scheduledLessonId" TEXT;

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "scheduledLessonId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "note" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_scheduledLessonId_key" ON "Submission"("scheduledLessonId");

-- CreateIndex
CREATE INDEX "Submission_studentUserId_idx" ON "Submission"("studentUserId");

-- CreateIndex
CREATE INDEX "Submission_teacherId_status_idx" ON "Submission"("teacherId", "status");

-- CreateIndex
CREATE INDEX "Submission_lessonId_idx" ON "Submission"("lessonId");

-- CreateIndex
CREATE INDEX "Course_isCustom_idx" ON "Course"("isCustom");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLedgerEntry_scheduledLessonId_type_key" ON "StudentLedgerEntry"("scheduledLessonId", "type");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_scheduledLessonId_fkey" FOREIGN KEY ("scheduledLessonId") REFERENCES "ScheduledLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLedgerEntry" ADD CONSTRAINT "StudentLedgerEntry_scheduledLessonId_fkey" FOREIGN KEY ("scheduledLessonId") REFERENCES "ScheduledLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

