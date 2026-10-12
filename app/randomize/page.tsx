import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { getKitchenIds } from "@/lib/kitchen";
import { getGlobalPoolRecipeIds } from "@/lib/global-pool";
import RandomizerClient from "./RandomizerClient";

export const metadata = { title: "What's For Dinner? — Randomizer" };

export default async function RandomizePage() {
  const kitchenIds = await getKitchenIds();

  const [rows, poolRecipeIds] = await Promise.all([
    kitchenIds.length
      ? prisma.recipe.findMany({
          where: { kitchenId: { in: kitchenIds } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    getGlobalPoolRecipeIds(),
  ]);

  const recipes = rows.map((r) => parseRecipe(r as Parameters<typeof parseRecipe>[0], poolRecipeIds));
  return <RandomizerClient recipes={recipes} />;
}
