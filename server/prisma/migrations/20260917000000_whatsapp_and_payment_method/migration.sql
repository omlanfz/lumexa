-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "StudentLedgerEntry" ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentDetail" TEXT;
