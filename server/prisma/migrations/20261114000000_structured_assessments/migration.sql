-- Structured assessments (Pre-University CSE) — purely additive (nothing is dropped, renamed or
-- rewritten, so every existing test, attempt and report is unchanged):
--   * AssessmentFormat gains STRUCTURED_V1: Part A 10 multiple-choice (1 mark each), Part B three
--     short answers (5 marks each) and Part C one practical (20 marks) = 45 marks, at most 40 minutes.
--   * Assessment.timeLimitMinutes (null = no limit, i.e. every existing test) and
--     AssessmentAttempt.deadlineAt (frozen when an attempt starts).
--   * ShortAnswerQuestion / ShortAnswerResponse: the written Part B, marked by the teacher.
--   * TestReport: the frozen Part B snapshot and its marks.

-- AlterEnum
ALTER TYPE "AssessmentFormat" ADD VALUE 'STRUCTURED_V1';

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "timeLimitMinutes" INTEGER;

-- AlterTable
ALTER TABLE "AssessmentAttempt" ADD COLUMN     "deadlineAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TestReport" ADD COLUMN     "hasShortAnswers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shortAnswerMaxScore" DOUBLE PRECISION,
ADD COLUMN     "shortAnswerResults" JSONB,
ADD COLUMN     "shortAnswerScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ShortAnswerQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 5,
    "rubric" JSONB,
    "modelAnswer" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "bankKey" TEXT,
    "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortAnswerQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortAnswerResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortAnswerResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShortAnswerQuestion_assessmentId_idx" ON "ShortAnswerQuestion"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortAnswerQuestion_assessmentId_bankKey_key" ON "ShortAnswerQuestion"("assessmentId", "bankKey");

-- CreateIndex
CREATE INDEX "ShortAnswerResponse_attemptId_idx" ON "ShortAnswerResponse"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortAnswerResponse_attemptId_questionId_key" ON "ShortAnswerResponse"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "ShortAnswerQuestion" ADD CONSTRAINT "ShortAnswerQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerResponse" ADD CONSTRAINT "ShortAnswerResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortAnswerResponse" ADD CONSTRAINT "ShortAnswerResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ShortAnswerQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

