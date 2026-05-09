-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_CONSENT', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "SpaceRank" AS ENUM ('STARCHILD', 'EXPLORER', 'COSMONAUT', 'NAVIGATOR', 'CAPTAIN', 'GALAXY_COMMANDER');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STUDENT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "studentUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "billingContactConsentAt" TIMESTAMP(3),
ADD COLUMN     "billingContactConsented" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billingContactEmail" TEXT,
ADD COLUMN     "billingContactStripeId" TEXT,
ADD COLUMN     "gemBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "spaceRank" "SpaceRank" NOT NULL DEFAULT 'STARCHILD',
ADD COLUMN     "streakFreezes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "streakWeeks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totalSessions" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL DEFAULT 6,
    "ageMax" INTEGER NOT NULL DEFAULT 18,
    "sessions" INTEGER NOT NULL DEFAULT 12,
    "gemCost" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GemWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemPurchase" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "gems" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GemPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialLead" (
    "id" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "childAge" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "timezone" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_isActive_idx" ON "Course"("isActive");

-- CreateIndex
CREATE INDEX "Course_category_idx" ON "Course"("category");

-- CreateIndex
CREATE INDEX "Lesson_courseId_idx" ON "Lesson"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "GemWallet_userId_key" ON "GemWallet"("userId");

-- CreateIndex
CREATE INDEX "GemPurchase_walletId_idx" ON "GemPurchase"("walletId");

-- CreateIndex
CREATE INDEX "GemPurchase_status_idx" ON "GemPurchase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentToken_token_key" ON "ConsentToken"("token");

-- CreateIndex
CREATE INDEX "ConsentToken_token_idx" ON "ConsentToken"("token");

-- CreateIndex
CREATE INDEX "TrialLead_status_idx" ON "TrialLead"("status");

-- CreateIndex
CREATE INDEX "Booking_studentUserId_idx" ON "Booking"("studentUserId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemWallet" ADD CONSTRAINT "GemWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemPurchase" ADD CONSTRAINT "GemPurchase_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "GemWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentToken" ADD CONSTRAINT "ConsentToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
