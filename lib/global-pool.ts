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

export type PullResult =
  | { status: "created"; recipeId: number }
  | { status: "already_exists"; recipeId: number }
  | { status: "not_found" };

/**
 * Copies a recipe into another kitchen, forked from the original. Reused by
 * the "Pull to my kitchen" action and by future auto-seeding — it does NOT
 * check permissions itself; callers must confirm the caller may write to
 * destinationKitchenId first.
 *
 * Idempotent: if the destination already has a recipe forked from this exact
 * original, returns that recipe instead of creating a duplicate. Ratings,
 * notes, cook history, and favorite status are intentionally not copied —
 * those are kitchen-specific and start fresh in the destination.
 */
export async function pullRecipeToKitchen(
  originalRecipeId: number,
  destinationKitchenId: number
): Promise<PullResult> {
  const original = await prisma.recipe.findUnique({ where: { id: originalRecipeId } });
  if (!original) return { status: "not_found" };

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
