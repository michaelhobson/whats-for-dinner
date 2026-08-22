"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createRecipe(
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const { name, raw, multi, prepTime, difficulty, ingredients, directions, cuisine, favorite } =
    parseFormData(formData);

  if (!name) return { error: "Recipe name is required." };

  const recipe = await prisma.recipe.create({
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

  redirect(`/recipes/${recipe.id}`);
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateRecipe(
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "Missing recipe ID." };

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
  await prisma.recipe.delete({ where: { id } });
  redirect("/recipes");
}

// ── Cook history ───────────────────────────────────────────────────────────────

export async function markCooked(formData: FormData) {
  const id = Number(formData.get("id"));
  await prisma.cookLog.create({ data: { recipeId: id } });
  revalidatePath(`/recipes/${id}`);
}

// ── Rating ─────────────────────────────────────────────────────────────────────

export async function updateRating(formData: FormData) {
  const id = Number(formData.get("id"));
  const rating = (formData.get("rating") as string | null) || null;
  const validRating = rating === "up" || rating === "down" ? rating : null;
  await prisma.recipe.update({ where: { id }, data: { rating: validRating } });
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/recipes");
}

// ── Notes ──────────────────────────────────────────────────────────────────────

export async function updateNotes(formData: FormData) {
  const id = Number(formData.get("id"));
  const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;
  await prisma.recipe.update({ where: { id }, data: { notes } });
  revalidatePath(`/recipes/${id}`);
}
