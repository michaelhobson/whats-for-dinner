"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type RecipeFormState = { error: string } | null;

export async function createRecipe(
  _prevState: RecipeFormState,
  formData: FormData
): Promise<RecipeFormState> {
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    return { error: "Recipe name is required." };
  }

  const raw = (key: string) =>
    ((formData.get(key) as string | null) ?? "").trim() || null;

  const multi = (key: string) =>
    (formData.getAll(key) as string[]).filter(Boolean).join(",");

  const prepRaw = Number(formData.get("prepTime") ?? 30);
  const prepTime = Number.isFinite(prepRaw) && prepRaw > 0 ? Math.round(prepRaw) : 30;

  const rawDifficulty = formData.get("difficulty") as string | null;
  const difficulty =
    rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard"
      ? rawDifficulty
      : "medium";

  const recipe = await prisma.recipe.create({
    data: {
      name,
      mainProtein: raw("mainProtein"),
      mainStarch: raw("mainStarch"),
      mainVegetable: raw("mainVegetable"),
      ingredients: formData.get("ingredients") as string || "[]",
      favorite: formData.get("favorite") === "on",
      dishCategory: raw("dishCategory"),
      difficulty,
      prepTime,
      mealType: multi("mealType"),
      cuisine: multi("cuisine"),
      flavorNotes: multi("flavorNotes"),
      season: multi("season"),
      cookingMethod: multi("cookingMethod"),
    },
  });

  redirect(`/recipes/${recipe.id}`);
}
