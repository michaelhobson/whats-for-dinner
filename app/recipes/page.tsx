import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { getKitchenIds } from "@/lib/kitchen";
import CookbookClient from "./CookbookClient";

export const metadata = { title: "Cookbook — What's For Dinner?" };

export default async function RecipesPage() {
  const kitchenIds = await getKitchenIds();

  const rows = kitchenIds.length
    ? await prisma.recipe.findMany({
        where: { kitchenId: { in: kitchenIds } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const recipes = rows.map((r) => parseRecipe(r as Parameters<typeof parseRecipe>[0]));

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cookbook</h1>
          </div>
          <Link
            href="/recipes/new"
            className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
          >
            + Add Recipe
          </Link>
        </div>

        <CookbookClient recipes={recipes} />
      </div>
    </div>
  );
}
