"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getKitchenId } from "@/lib/kitchen";

export type ImportResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string };

export type ImportState = ImportResult | null;

export async function importRecipes(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const kitchenId = await getKitchenId();
  if (!kitchenId) return { ok: false, error: "No kitchen found — please sign in again." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "File too large (max 10 MB)." };

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "Could not parse the file — is it a valid JSON export?" };
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as Record<string, unknown>).recipes)
  ) {
    return { ok: false, error: "File does not look like a What's For Dinner backup." };
  }

  const recipes = (data as { recipes: unknown[] }).recipes;
  const existing = await prisma.recipe.findMany({
    where: { kitchenId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((r) => r.name));

  let added = 0;
  let skipped = 0;

  for (const raw of recipes) {
    if (typeof raw !== "object" || raw === null) { skipped++; continue; }
    const r = raw as Record<string, unknown>;

    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) { skipped++; continue; }
    if (existingNames.has(name)) { skipped++; continue; }

    const difficulty =
      r.difficulty === "easy" || r.difficulty === "medium" || r.difficulty === "hard"
        ? r.difficulty
        : "medium";

    const prepTime =
      typeof r.prepTime === "number" && r.prepTime > 0 ? Math.round(r.prepTime) : 30;

    const strArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];

    const cookLogs = Array.isArray(r.cookHistory)
      ? (r.cookHistory as unknown[])
          .filter(
            (log): log is { cookedAt: string } =>
              typeof log === "object" &&
              log !== null &&
              typeof (log as Record<string, unknown>).cookedAt === "string"
          )
          .map((log) => ({ cookedAt: new Date(log.cookedAt) }))
      : [];

    await prisma.recipe.create({
      data: {
        name,
        kitchenId,
        mainProtein:   typeof r.mainProtein   === "string" ? r.mainProtein   : null,
        mainStarch:    typeof r.mainStarch    === "string" ? r.mainStarch    : null,
        mainVegetable: typeof r.mainVegetable === "string" ? r.mainVegetable : null,
        ingredients:   JSON.stringify(Array.isArray(r.ingredients) ? r.ingredients : []),
        directions:    JSON.stringify(Array.isArray(r.directions)  ? r.directions  : []),
        favorite:      r.favorite === true,
        dishCategory:  typeof r.dishCategory  === "string" ? r.dishCategory  : null,
        difficulty,
        prepTime,
        mealType:      strArr(r.mealType).join(","),
        cuisine:       JSON.stringify(Array.isArray(r.cuisine) ? r.cuisine : []),
        flavorNotes:   strArr(r.flavorNotes).join(","),
        season:        strArr(r.season).join(","),
        cookingMethod: strArr(r.cookingMethod).join(","),
        rating:        r.rating === "up" || r.rating === "down" ? r.rating : null,
        notes:         typeof r.notes === "string" ? r.notes : null,
        cookHistory:   { create: cookLogs },
      },
    });

    existingNames.add(name); // prevent duplicates within the same import file
    added++;
  }

  revalidatePath("/recipes");
  revalidatePath("/randomize");

  return { ok: true, added, skipped };
}
