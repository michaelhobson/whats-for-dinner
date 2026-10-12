-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "shareRevokedAt" TIMESTAMP(3),
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_shareToken_key" ON "Recipe"("shareToken");
