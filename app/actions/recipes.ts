"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getKitchenId, getAllKitchenIds } from "@/lib/kitchen";

export type RecipeFormState = { error: string } | null;

// ── Shared parsing helpers ─────────────────────────────────────────────────────

function parseFormData(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();

  const raw = (key: string) =>
    ((formData.get(key) as string | null) ?? "").trim() || null;

  const multi = (key: string) =>
    (formData.getAll(key) as string[]).filter(Boolean).join(",");

  const prepRaw = Number(formData.get("prepTime") ?? 30);
  const prepTime = Number.isFinite(prepRaw) && prepRaw > 0 ? Math.round(prepRaw) : 30;

  const rawDifficulty = formData.get("difficulty") as string | null;
  const difficulty: "easy" | "medium" | "hard" =
    rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
      ? rawDifficulty
      : "medium";

  return {
    name,
    raw,
    multi,
    prepTime,
    difficulty,
    ingredients: (formData.get("ingredients") as string) || "[]",
    directions:  (formData.get("directions") as string) || "[]",
    cuisine:     (formData.get("cuisineJson") as string | null) ?? "[]",
    favorite:    formData.get("favorite") === "on",
  };
}

// Returns null if the recipe belongs to one of the user's kitchens, or an
// error message if the user has no session or the recipe is in a different kitchen.
async function checkRecipeOwnership(recipeId: number): Promise<string | null> {
  const kitchenIds = await getAllKitchenIds();
  if (kitchenIds.length === 0) return "Not signed in.";

  const found = await prisma.recipe.findFirst({
    where: { id: recipeId, kitchenId: { in: kitchenIds } },
    select: { id: true },
  });

  return found ? null : "Recipe not found.";
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createRecipe(
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const kitchenId = await getKitchenId();
  if (!kitchenId) return { error: "No kitchen found — please sign in again." };

  const { name, raw, multi, prepTime, difficulty, ingredients, directions, cuisine, favorite } =
    parseFormData(formData);

  if (!name) return { error: "Recipe name is required." };

  const recipe = await prisma.recipe.create({
    data: {
      name,
      kitchenId,
      mainProtein:   raw("mainProtein"),
      mainStarch:    raw("mainStarch"),
      mainVegetable: raw("mainVegetable"),
      ingredients,
      directions,
      favorite,
      dishCategory:  raw("dishCategory"),
      difficulty,
      prepTime,
      mealType:      multi("mealType"),
      cuisine,
      flavorNotes:   multi("flavorNotes"),
      season:        multi("season"),
      cookingMethod: multi("cookingMethod"),
      sourceUrl:     raw("sourceUrl"),
    },
  });

  // Revalidate before redirect — redirect only streams the destination page's
  // RSC payload and does not invalidate other cached routes on its own.
  revalidatePath("/recipes");
  revalidatePath("/randomize");
  redirect(`/recipes/${recipe.id}`);
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateRecipe(
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "Missing recipe ID." };

  const ownershipError = await checkRecipeOwnership(id);
  if (ownershipError) return { error: ownershipError };

  const { name, raw, multi, prepTime, difficulty, ingredients, directions, cuisine, favorite } =
    parseFormData(formData);

  if (!name) return { error: "Recipe name is required." };

  await prisma.recipe.update({
    where: { id },
    data: {
      name,
      mainProtein:   raw("mainProtein"),
      mainStarch:    raw("mainStarch"),
      mainVegetable: raw("mainVegetable"),
      ingredients,
      directions,
      favorite,
      dishCategory:  raw("dishCategory"),
      difficulty,
      prepTime,
      mealType:      multi("mealType"),
      cuisine,
      flavorNotes:   multi("flavorNotes"),
      season:        multi("season"),
      cookingMethod: multi("cookingMethod"),
    },
  });

  redirect(`/recipes/${id}`);
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteRecipe(formData: FormData) {
  const id = Number(formData.get("id"));
  const ownershipError = await checkRecipeOwnership(id);
  if (ownershipError) redirect("/recipes"); // silently bounce — not their recipe

  await prisma.recipe.delete({ where: { id } });
  redirect("/recipes");
}

// ── Cook history ───────────────────────────────────────────────────────────────

export async function markCooked(formData: FormData) {
  const id = Number(formData.get("id"));
  const ownershipError = await checkRecipeOwnership(id);
  if (ownershipError) return; // silently ignore unauthorised attempts

  await prisma.cookLog.create({ data: { recipeId: id } });
  revalidatePath(`/recipes/${id}`);
}

// ── Rating ─────────────────────────────────────────────────────────────────────

export async function updateRating(formData: FormData) {
  const id = Number(formData.get("id"));
  const ownershipError = await checkRecipeOwnership(id);
  if (ownershipError) return;

  const rating = (formData.get("rating") as string | null) || null;
  const validRating = rating === "up" || rating === "down" ? rating : null;
  await prisma.recipe.update({ where: { id }, data: { rating: validRating } });
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/recipes");
}

// ── Notes ──────────────────────────────────────────────────────────────────────

export async function updateNotes(formData: FormData) {
  const id = Number(formData.get("id"));
  const ownershipError = await checkRecipeOwnership(id);
  if (ownershipError) return;

  const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;
  await prisma.recipe.update({ where: { id }, data: { notes } });
  revalidatePath(`/recipes/${id}`);
}
