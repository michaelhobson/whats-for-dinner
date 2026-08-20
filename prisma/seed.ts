import "dotenv/config";
import { PrismaClient, Difficulty } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

type Ingredient = { name: string; quantity?: string };
const ing = (list: Ingredient[]) => JSON.stringify(list);

async function main() {
  await prisma.recipe.deleteMany();

  await prisma.recipe.createMany({
    data: [
      {
        name: "Pasta Carbonara",
        mainProtein: "pancetta",
        mainStarch: "spaghetti",
        mainVegetable: null,
        ingredients: ing([
          { name: "spaghetti", quantity: "400g" },
          { name: "pancetta or guanciale", quantity: "150g" },
          { name: "eggs", quantity: "4 large" },
          { name: "Pecorino Romano", quantity: "80g, grated" },
          { name: "black pepper", quantity: "to taste" },
          { name: "salt", quantity: "for pasta water" },
        ]),
        dishCategory: "pasta",
        difficulty: Difficulty.medium,
        prepTime: 25,
        mealType: "dinner",
        cuisine: "Mediterranean",
        flavorNotes: "rich,cheesy,umami,creamy",
        season: "any",
        cookingMethod: "stovetop",
      },
      {
        name: "Huevos Rancheros",
        mainProtein: "eggs",
        mainStarch: "tortilla",
        mainVegetable: "tomato",
        ingredients: ing([
          { name: "corn tortillas", quantity: "4" },
          { name: "eggs", quantity: "4" },
          { name: "black beans", quantity: "1 can, drained" },
          { name: "salsa roja", quantity: "1 cup" },
          { name: "avocado", quantity: "1, sliced" },
          { name: "queso fresco", quantity: "60g, crumbled" },
          { name: "jalapeño", quantity: "1, sliced" },
          { name: "cilantro", quantity: "handful" },
          { name: "vegetable oil", quantity: "2 tbsp" },
        ]),
        dishCategory: "eggs",
        difficulty: Difficulty.easy,
        prepTime: 20,
        mealType: "breakfast,lunch",
        cuisine: "Latin American",
        flavorNotes: "bright,spicy,tangy",
        season: "any",
        cookingMethod: "stovetop",
      },
      {
        name: "Miso Ramen",
        mainProtein: "soft-boiled egg",
        mainStarch: "ramen noodles",
        mainVegetable: "bok choy",
        ingredients: ing([
          { name: "fresh ramen noodles", quantity: "200g" },
          { name: "white miso paste", quantity: "3 tbsp" },
          { name: "chicken or vegetable broth", quantity: "1 litre" },
          { name: "bok choy", quantity: "2 small heads" },
          { name: "eggs", quantity: "2, soft-boiled" },
          { name: "corn kernels", quantity: "½ cup" },
          { name: "nori", quantity: "2 sheets" },
          { name: "sesame oil", quantity: "1 tsp" },
          { name: "soy sauce", quantity: "1 tbsp" },
          { name: "garlic", quantity: "2 cloves, minced" },
          { name: "fresh ginger", quantity: "1 inch, grated" },
        ]),
        dishCategory: "soup",
        difficulty: Difficulty.medium,
        prepTime: 35,
        mealType: "dinner,lunch",
        cuisine: "East Asian",
        flavorNotes: "umami,rich",
        season: "fall,winter",
        cookingMethod: "stovetop",
      },
    ],
  });

  console.log("Seeded 3 recipes: Pasta Carbonara, Huevos Rancheros, Miso Ramen");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
