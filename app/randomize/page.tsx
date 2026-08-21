import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import RandomizerClient from "./RandomizerClient";

export const metadata = { title: "What's For Dinner? — Randomizer" };

export default async function RandomizePage() {
  const rows = await prisma.recipe.findMany({ orderBy: { name: "asc" } });
  const recipes = rows.map((r) => parseRecipe(r as Parameters<typeof parseRecipe>[0]));
  return <RandomizerClient recipes={recipes} />;
}
