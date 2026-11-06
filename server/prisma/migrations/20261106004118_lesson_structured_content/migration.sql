-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "miniQuiz" JSONB,
ADD COLUMN     "teacherNotes" TEXT,
ADD COLUMN     "visuals" JSONB;

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sectionsRead" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activitiesDone" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quizResults" JSONB,
    "quizCompletedAt" TIMESTAMP(3),
    "quizScore" INTEGER,
    "quizTotal" INTEGER,
    "firstOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonProgress_lessonId_idx" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_studentUserId_lessonId_key" ON "LessonProgress"("studentUserId", "lessonId");

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
