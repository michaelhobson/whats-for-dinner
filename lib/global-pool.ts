/**
 * The Global Pool is a single, special Kitchen (isGlobalPool: true) whose
 * recipes are readable by any logged-in user regardless of membership — the
 * one deliberate exception to normal kitchen-scoped visibility. Writes to it
 * go through the exact same Chef-or-above enforcement as any other kitchen;
 * nothing special there.
 */

import { cache } from "react";
import { prisma } from "./prisma";

// Memoized per-request — cheap to call from multiple places in one render.
export const getGlobalPoolKitchenId = cache(async (): Promise<number | null> => {
  const pool = await prisma.kitchen.findFirst({
    where: { isGlobalPool: true },
    select: { id: true },
  });
  return pool?.id ?? null;
});

// Ids of recipes currently IN the Global Pool kitchen — used to decide
// whether a recipe elsewhere is "starter" (forked from the pool specifically,
// not from some other kitchen). Memoized per-request like the id lookup above.
export const getGlobalPoolRecipeIds = cache(async (): Promise<Set<number>> => {
  const poolId = await getGlobalPoolKitchenId();
  if (!poolId) return new Set();

  const rows = await prisma.recipe.findMany({ where: { kitchenId: poolId }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
});

export type PullResult =
  | { status: "created"; recipeId: number }
  | { status: "already_exists"; recipeId: number }
  // Destination IS the original recipe's own kitchen — nothing to pull, the
  // recipe is already (and has always been) right there.
  | { status: "same_kitchen"; recipeId: number }
  | { status: "not_found" };

/**
 * Copies a recipe into another kitchen, forked from the original. Reused by
 * the "Pull to my kitchen" action and by future auto-seeding — it does NOT
 * check permissions itself; callers must confirm the caller may write to
 * destinationKitchenId first.
 *
 * Idempotent: if the destination already has a recipe forked from this exact
 * original, returns that recipe instead of creating a duplicate. Also blocks
 * pulling into the original's own kitchen, which would otherwise create a
 * true duplicate sitting alongside the original (no fork to find there, since
 * it's not a fork — it's the thing itself). Ratings, notes, cook history, and
 * favorite status are intentionally not copied — those are kitchen-specific
 * and start fresh in the destination.
 */
export async function pullRecipeToKitchen(
  originalRecipeId: number,
  destinationKitchenId: number
): Promise<PullResult> {
  const original = await prisma.recipe.findUnique({ where: { id: originalRecipeId } });
  if (!original) return { status: "not_found" };

  if (original.kitchenId === destinationKitchenId) {
    return { status: "same_kitchen", recipeId: original.id };
  }

  const existing = await prisma.recipe.findFirst({
    where: { kitchenId: destinationKitchenId, forkedFromRecipeId: originalRecipeId },
    select: { id: true },
  });
  if (existing) return { status: "already_exists", recipeId: existing.id };

  const copy = await prisma.recipe.create({
    data: {
      name: original.name,
      kitchenId: destinationKitchenId,
      mainProtein: original.mainProtein,
      mainStarch: original.mainStarch,
      mainVegetable: original.mainVegetable,
      ingredients: original.ingredients,
      directions: original.directions,
      dishCategory: original.dishCategory,
      difficulty: original.difficulty,
      prepTime: original.prepTime,
      mealType: original.mealType,
      cuisine: original.cuisine,
      flavorNotes: original.flavorNotes,
      season: original.season,
      cookingMethod: original.cookingMethod,
      sourceUrl: original.sourceUrl,
      forkedFromRecipeId: original.id,
    },
  });

  return { status: "created", recipeId: copy.id };
}

/**
 * Auto-seeds a freshly-created kitchen with the full Global Pool recipe set,
 * going forward only (never called retroactively against existing kitchens).
 * Calls the exact same pullRecipeToKitchen used by the manual "Pull to my
 * kitchen" action, once per pool recipe, so lineage (forkedFromRecipeId) and
 * idempotency behave identically to a manual pull.
 *
 * Best-effort: a failure copying one recipe is logged and skipped rather than
 * failing kitchen creation outright.
 */
export async function seedKitchenFromGlobalPool(destinationKitchenId: number): Promise<void> {
  const poolId = await getGlobalPoolKitchenId();
  if (!poolId || destinationKitchenId === poolId) return;

  const poolRecipes = await prisma.recipe.findMany({
    where: { kitchenId: poolId },
    select: { id: true },
  });

  for (const { id } of poolRecipes) {
    try {
      await pullRecipeToKitchen(id, destinationKitchenId);
    } catch (e) {
      console.error(`Failed to seed recipe ${id} into kitchen ${destinationKitchenId}:`, e);
    }
  }
}
