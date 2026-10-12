/**
 * One-time setup: create the Global Pool kitchen, add you as its Restaurateur,
 * and copy your existing recipes into it as new, independent originals (no
 * forkedFromRecipeId — these aren't forks of anything).
 *
 * Idempotent: safe to re-run. It skips any recipe whose name already exists
 * in the Global Pool, and upserts (rather than duplicates) your membership
 * and the pool kitchen itself. Your source kitchen is never modified.
 *
 * Note: ratings, notes, cook history, and favorite status are intentionally
 * NOT copied — same "kitchen-specific, starts fresh" rule used for pulls.
 * If you'd rather carry those over for this initial seed, say so and I'll
 * adjust before you run it.
 *
 * Usage:
 *   npx tsx prisma/seed-global-pool.ts you@example.com
 *   npx tsx prisma/seed-global-pool.ts you@example.com --kitchen-id=3   (override which kitchen to copy from)
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [emailArg, ...rest] = process.argv.slice(2);
  if (!emailArg) {
    console.error("Usage: npx tsx prisma/seed-global-pool.ts <your-email> [--kitchen-id=N]");
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();

  const kitchenIdFlag = rest.find((a) => a.startsWith("--kitchen-id="));
  const kitchenIdOverride = kitchenIdFlag ? Number(kitchenIdFlag.split("=")[1]) : null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  // ── Resolve the source kitchen ──────────────────────────────────────────────
  let sourceKitchenId: number;
  if (kitchenIdOverride) {
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenIdOverride } });
    if (!kitchen) {
      console.error(`No kitchen with id ${kitchenIdOverride}.`);
      process.exit(1);
    }
    sourceKitchenId = kitchen.id;
  } else {
    const oldestMembership = await prisma.kitchenMembership.findFirst({
      where: { userId: user.id },
      orderBy: { kitchen: { createdAt: "asc" } },
      include: { kitchen: true },
    });
    if (!oldestMembership) {
      console.error(`${email} has no kitchen memberships.`);
      process.exit(1);
    }
    sourceKitchenId = oldestMembership.kitchenId;
    console.log(`Using your oldest kitchen: "${oldestMembership.kitchen.name}" (id ${sourceKitchenId}).`);
  }

  // ── Find or create the Global Pool kitchen ──────────────────────────────────
  let pool = await prisma.kitchen.findFirst({ where: { isGlobalPool: true } });
  if (!pool) {
    pool = await prisma.kitchen.create({ data: { name: "Global Pool", isGlobalPool: true } });
    console.log(`Created Global Pool kitchen (id ${pool.id}).`);
  } else {
    console.log(`Global Pool kitchen already exists (id ${pool.id}).`);
  }

  if (pool.id === sourceKitchenId) {
    console.error("Source kitchen is the Global Pool itself — nothing to copy.");
    process.exit(1);
  }

  // ── Ensure you're a Restaurateur member of it ───────────────────────────────
  await prisma.kitchenMembership.upsert({
    where: { userId_kitchenId: { userId: user.id, kitchenId: pool.id } },
    update: { role: "RESTAURATEUR" },
    create: { userId: user.id, kitchenId: pool.id, role: "RESTAURATEUR" },
  });
  console.log(`Confirmed ${email} as Restaurateur of the Global Pool.`);

  // ── Copy recipes, skipping any name already present in the pool ────────────
  const [sourceRecipes, existingPoolNames] = await Promise.all([
    prisma.recipe.findMany({ where: { kitchenId: sourceKitchenId } }),
    prisma.recipe.findMany({ where: { kitchenId: pool.id }, select: { name: true } }),
  ]);
  const existingNames = new Set(existingPoolNames.map((r) => r.name));

  let created = 0;
  let skipped = 0;

  for (const recipe of sourceRecipes) {
    if (existingNames.has(recipe.name)) {
      skipped++;
      continue;
    }

    await prisma.recipe.create({
      data: {
        name: recipe.name,
        kitchenId: pool.id,
        mainProtein: recipe.mainProtein,
        mainStarch: recipe.mainStarch,
        mainVegetable: recipe.mainVegetable,
        ingredients: recipe.ingredients,
        directions: recipe.directions,
        dishCategory: recipe.dishCategory,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        mealType: recipe.mealType,
        cuisine: recipe.cuisine,
        flavorNotes: recipe.flavorNotes,
        season: recipe.season,
        cookingMethod: recipe.cookingMethod,
        sourceUrl: recipe.sourceUrl,
        // forkedFromRecipeId intentionally omitted — these are originals.
        // favorite/rating/notes/cookHistory intentionally omitted — start fresh.
      },
    });
    existingNames.add(recipe.name); // guards against duplicate names within the source itself
    created++;
  }

  console.log(`\nDone. ${created} recipe${created === 1 ? "" : "s"} copied into the Global Pool, ${skipped} skipped (already present).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
