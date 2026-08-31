-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultKitchenId" INTEGER;

-- CreateTable
CREATE TABLE "KitchenInvite" (
    "id" SERIAL NOT NULL,
    "kitchenId" INTEGER NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "role" "KitchenRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KitchenInvite_token_key" ON "KitchenInvite"("token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultKitchenId_fkey" FOREIGN KEY ("defaultKitchenId") REFERENCES "Kitchen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenInvite" ADD CONSTRAINT "KitchenInvite_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenInvite" ADD CONSTRAINT "KitchenInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
