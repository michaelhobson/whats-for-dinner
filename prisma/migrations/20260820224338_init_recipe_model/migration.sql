-- CreateTable
CREATE TABLE "Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "mainProtein" TEXT,
    "mainStarch" TEXT,
    "mainVegetable" TEXT,
    "ingredients" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "dishCategory" TEXT,
    "difficulty" TEXT NOT NULL,
    "prepTime" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "flavorNotes" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "cookingMethod" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
