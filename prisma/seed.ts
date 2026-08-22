import "dotenv/config";
import { PrismaClient, Difficulty } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Ingredient = { name: string; amount?: string; unit?: string };
type CuisinePairing = { region: string; style: string };
const ing = (list: Ingredient[]) => JSON.stringify(list);
const cuis = (list: CuisinePairing[]) => JSON.stringify(list);

async function main() {
  // By default, skip seeding if recipes already exist so user-added recipes
  // are not wiped. Pass --force to clear and reseed from scratch.
  const force = process.argv.includes("--force");
  const existingCount = await prisma.recipe.count();
  if (existingCount > 0 && !force) {
    console.log(
      `Skipping seed: ${existingCount} recipe(s) already in the database.\n` +
      `Run with --force to wipe and reseed.`
    );
    return;
  }

  if (force) await prisma.recipe.deleteMany();

  await prisma.recipe.createMany({
    data: [
      {
        name: "Pasta Carbonara",
        mainProtein: "pancetta",
        mainStarch: "spaghetti",
        mainVegetable: null,
        ingredients: ing([
          { name: "spaghetti",             amount: "400",  unit: "g" },
          { name: "pancetta or guanciale", amount: "150",  unit: "g" },
          { name: "eggs",                  amount: "4" },
          { name: "Pecorino Romano",       amount: "80",   unit: "g" },
          { name: "black pepper",          unit: "to taste" },
          { name: "salt",                  unit: "as needed" },
        ]),
        dishCategory: "pasta",
        difficulty: Difficulty.medium,
        prepTime: 25,
        mealType: "dinner",
        cuisine: cuis([{ region: "Mediterranean", style: "Italian" }]),
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
          { name: "corn tortillas",  amount: "4",  unit: "piece" },
          { name: "eggs",            amount: "4" },
          { name: "black beans",     amount: "1",  unit: "can" },
          { name: "salsa roja",      amount: "1",  unit: "cup" },
          { name: "avocado",         amount: "1" },
          { name: "queso fresco",    amount: "60", unit: "g" },
          { name: "jalapeño",        amount: "1" },
          { name: "cilantro",        unit: "handful" },
          { name: "vegetable oil",   amount: "2",  unit: "tbsp" },
        ]),
        dishCategory: "eggs",
        difficulty: Difficulty.easy,
        prepTime: 20,
        mealType: "breakfast,lunch",
        cuisine: cuis([{ region: "Latin American", style: "Mexican" }]),
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
          { name: "fresh ramen noodles",        amount: "200", unit: "g" },
          { name: "white miso paste",           amount: "3",   unit: "tbsp" },
          { name: "chicken or vegetable broth", amount: "1",   unit: "L" },
          { name: "bok choy",                   amount: "2",   unit: "head" },
          { name: "eggs (soft-boiled)",         amount: "2" },
          { name: "corn kernels",               amount: "½",   unit: "cup" },
          { name: "nori",                       amount: "2",   unit: "sheet" },
          { name: "sesame oil",                 amount: "1",   unit: "tsp" },
          { name: "soy sauce",                  amount: "1",   unit: "tbsp" },
          { name: "garlic",                     amount: "2",   unit: "clove" },
          { name: "fresh ginger, grated",       amount: "1",   unit: "piece" },
        ]),
        dishCategory: "soup",
        difficulty: Difficulty.medium,
        prepTime: 35,
        mealType: "dinner,lunch",
        cuisine: cuis([{ region: "East Asian", style: "Japanese" }]),
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
