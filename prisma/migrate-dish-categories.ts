/**
 * One-time migration: map free-text dishCategory values to the fixed
 * DISH_CATEGORIES list.  Run against LOCAL dev DB only by default.
 *
 *   npx tsx prisma/migrate-dish-categories.ts
 *
 * Review the printed summary before running against production.
 */

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mapToDishCategory } from "../lib/dish-categories";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Safety check — warn loudly if pointed at a non-local database.
  const url = process.env.DATABASE_URL ?? "";
  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("@db:") || // common Docker service name
    url === "";
  if (!isLocal) {
    console.error(
      "\n⛔  DATABASE_URL does not look like a local database.\n" +
        "    Run this migration locally and apply any corrections\n" +
        "    manually before touching production.\n"
    );
    process.exit(1);
  }

  const recipes = await prisma.recipe.findMany({
    where: { dishCategory: { not: null } },
    select: { id: true, name: true, dishCategory: true },
    orderBy: { name: "asc" },
  });

  if (recipes.length === 0) {
    console.log("No recipes with a dishCategory — nothing to migrate.");
    return;
  }

  // Track original → mapped for the summary
  const mapping: Map<string, { mapped: string; recipes: string[] }> = new Map();

  for (const recipe of recipes) {
    const original = recipe.dishCategory!;
    const mapped = mapToDishCategory(original);

    if (!mapping.has(original)) {
      mapping.set(original, { mapped, recipes: [] });
    }
    mapping.get(original)!.recipes.push(recipe.name);

    if (original !== mapped) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { dishCategory: mapped },
      });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n=== Dish Category Migration Summary ===\n");

  const exact: string[] = [];
  const remapped: string[] = [];
  const fallback: string[] = [];

  for (const [original, { mapped, recipes: names }] of [
    ...mapping.entries(),
  ].sort(([a], [b]) => a.localeCompare(b))) {
    const label = `  "${original}" (${names.length} recipe${names.length > 1 ? "s" : ""})`;
    if (original === mapped) {
      exact.push(`${label}  ✓ exact match`);
    } else if (mapped === "Something Else") {
      fallback.push(
        `${label}  ⚠️  → "Something Else"\n     Recipes: ${names.join(", ")}`
      );
    } else {
      remapped.push(`${label}  → "${mapped}"`);
    }
  }

  if (exact.length) {
    console.log("Exact matches (no change needed):");
    exact.forEach((l) => console.log(l));
    console.log();
  }
  if (remapped.length) {
    console.log("Remapped to nearest fixed category:");
    remapped.forEach((l) => console.log(l));
    console.log();
  }
  if (fallback.length) {
    console.log('Fell through to "Something Else" — review these manually:');
    fallback.forEach((l) => console.log(l));
    console.log();
  }

  const changed = recipes.filter(
    (r) => mapToDishCategory(r.dishCategory!) !== r.dishCategory
  ).length;
  console.log(
    `Done. ${changed} recipe${changed !== 1 ? "s" : ""} updated, ${
      recipes.length - changed
    } already correct.\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
