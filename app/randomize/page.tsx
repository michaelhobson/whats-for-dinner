import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { getKitchenIds } from "@/lib/kitchen";
import RandomizerClient from "./RandomizerClient";

export const metadata = { title: "What's For Dinner? — Randomizer" };

export default async function RandomizePage() {
  const kitchenIds = await getKitchenIds();

  const rows = kitchenIds.length
    ? await prisma.recipe.findMany({
        where: { kitchenId: { in: kitchenIds } },
        orderBy: { name: "asc" },
      })
    : [];

  const recipes = rows.map((r) => parseRecipe(r as Parameters<typeof parseRecipe>[0]));
  return <RandomizerClient recipes={recipes} />;
}
