-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "grades" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rankTier" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "weeklyPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT;
