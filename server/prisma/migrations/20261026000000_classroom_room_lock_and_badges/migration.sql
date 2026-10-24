-- Simple classrooms: a teacher lock, and the Classroom Badge System.
--
-- ClassroomRoomState: one row per classroom the teacher has ever locked or
-- unlocked (a room without a row is simply unlocked). It is a table, not
-- only LiveKit room metadata, because the LiveKit room disappears when it
-- empties and a lock must survive the teacher's connection dropping.
--
-- ClassroomBadgeAward: every badge a teacher awards a student in class. The
-- 16 badge definitions live in code; a row is who got which badge, from whom,
-- in which class, when. (requestId, studentUserId) is unique so a repeated
-- click or retry can never store an award twice; undo sets revokedAt.
--
-- Purely additive: two new tables, nothing existing is altered.

-- CreateTable
CREATE TABLE "ClassroomRoomState" (
    "room" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomRoomState_pkey" PRIMARY KEY ("room")
);

-- CreateTable
CREATE TABLE "ClassroomBadgeAward" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "awardedByUserId" TEXT NOT NULL,
    "scheduledLessonId" TEXT,
    "room" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "ClassroomBadgeAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassroomBadgeAward_studentUserId_createdAt_idx" ON "ClassroomBadgeAward"("studentUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassroomBadgeAward_room_createdAt_idx" ON "ClassroomBadgeAward"("room", "createdAt");

-- CreateIndex
CREATE INDEX "ClassroomBadgeAward_scheduledLessonId_idx" ON "ClassroomBadgeAward"("scheduledLessonId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomBadgeAward_requestId_studentUserId_key" ON "ClassroomBadgeAward"("requestId", "studentUserId");

-- AddForeignKey
ALTER TABLE "ClassroomBadgeAward" ADD CONSTRAINT "ClassroomBadgeAward_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomBadgeAward" ADD CONSTRAINT "ClassroomBadgeAward_awardedByUserId_fkey" FOREIGN KEY ("awardedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomBadgeAward" ADD CONSTRAINT "ClassroomBadgeAward_scheduledLessonId_fkey" FOREIGN KEY ("scheduledLessonId") REFERENCES "ScheduledLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

