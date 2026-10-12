import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { getGlobalPoolKitchenId } from "@/lib/global-pool";
import { getWritableKitchens } from "@/lib/kitchen";
import { GlobalPoolRecipeCard } from "@/components/GlobalPoolRecipeCard";

export const metadata = { title: "Global Pool — What's For Dinner?" };

export default async function GlobalPoolPage() {
  const poolId = await getGlobalPoolKitchenId();

  if (!poolId) {
    return (
      <div className="flex-1 bg-orange-50">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Global Pool</h1>
          <p className="text-gray-500">
            The Global Pool hasn&apos;t been set up yet — ask an admin to run the seed script.
          </p>
        </div>
      </div>
    );
  }

  const [rows, writableKitchensAll] = await Promise.all([
    prisma.recipe.findMany({ where: { kitchenId: poolId }, orderBy: { createdAt: "desc" } }),
    getWritableKitchens(),
  ]);

  const recipes = rows.map((r) => parseRecipe(r as Parameters<typeof parseRecipe>[0]));

  // Pulling FROM the pool INTO the pool makes no sense — exclude it as a destination.
  const writableKitchens = writableKitchensAll.filter((k) => k.id !== poolId);

  // Cheap to precompute "already pulled" up front only when there's exactly
  // one possible destination; with several, we resolve that reactively per
  // pull attempt instead of checking every recipe against every kitchen.
  let alreadyPulledIds = new Set<number>();
  if (writableKitchens.length === 1) {
    const existingForks = await prisma.recipe.findMany({
      where: {
        kitchenId: writableKitchens[0].id,
        forkedFromRecipeId: { in: recipes.map((r) => r.id) },
      },
      select: { forkedFromRecipeId: true },
    });
    alreadyPulledIds = new Set(
      existingForks.map((f) => f.forkedFromRecipeId).filter((id): id is number => id != null)
    );
  }

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Global Pool</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Shared recipes anyone can browse.{" "}
            {writableKitchens.length > 0
              ? "Pull one into your own kitchen to make it yours."
              : "Join a kitchen as Chef or Restaurateur to start pulling recipes."}
          </p>
        </div>

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
            <span className="text-6xl mb-4">🌐</span>
            <p className="text-xl font-medium text-gray-500 mb-1">The pool is empty</p>
            <p className="text-sm">Check back once some recipes have been added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => (
              <GlobalPoolRecipeCard
                key={recipe.id}
                recipe={recipe}
                writableKitchens={writableKitchens}
                alreadyPulled={alreadyPulledIds.has(recipe.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
