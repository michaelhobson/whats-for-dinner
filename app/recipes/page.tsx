import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import RecipeCard from "@/components/RecipeCard";

export const metadata = { title: "Browse Recipes — What's For Dinner?" };

export default async function RecipesPage() {
  const rows = await prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
  const recipes = rows.map((r) => parseRecipe(r as Parameters<typeof parseRecipe>[0]));

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Recipes</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {recipes.length === 0
                ? "No recipes yet"
                : `${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href="/recipes/new"
            className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors"
          >
            + Add Recipe
          </Link>
        </div>

        {/* Grid or empty state */}
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
            <span className="text-6xl mb-4">🍳</span>
            <p className="text-xl font-medium text-gray-500 mb-1">No recipes yet</p>
            <p className="text-sm mb-6">Add your first one to get started.</p>
            <Link
              href="/recipes/new"
              className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              Add a Recipe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
