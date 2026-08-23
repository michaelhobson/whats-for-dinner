-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "forkedFromRecipeId" INTEGER,
ADD COLUMN     "sourceUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_forkedFromRecipeId_fkey" FOREIGN KEY ("forkedFromRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
