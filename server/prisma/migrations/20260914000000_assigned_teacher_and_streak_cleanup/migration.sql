-- AlterTable
ALTER TABLE "User" DROP COLUMN "streakFreezes",
ADD COLUMN     "assignedTeacherId" TEXT;

-- CreateIndex
CREATE INDEX "User_assignedTeacherId_idx" ON "User"("assignedTeacherId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assignedTeacherId_fkey" FOREIGN KEY ("assignedTeacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
