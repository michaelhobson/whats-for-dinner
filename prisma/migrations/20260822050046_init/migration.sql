-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mainProtein" TEXT,
    "mainStarch" TEXT,
    "mainVegetable" TEXT,
    "ingredients" TEXT NOT NULL,
    "directions" TEXT NOT NULL DEFAULT '[]',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "dishCategory" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "prepTime" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "flavorNotes" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "cookingMethod" TEXT NOT NULL,
    "rating" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookLog" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "cookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CookLog" ADD CONSTRAINT "CookLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
