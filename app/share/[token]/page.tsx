import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { auth } from "@/auth";
import { getWritableKitchens } from "@/lib/kitchen";
import { pullFromShareLink } from "@/app/actions/share";
import { PullRecipeControl } from "@/components/PullRecipeControl";
import { RecipeHeader, RecipeStatChips, RecipeBody } from "@/components/RecipeDetailView";

// Shared recipe state can change any time — never statically cache this page.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { shareToken: token, shareRevokedAt: null },
    select: { name: true },
  });
  return {
    title: recipe ? `${recipe.name} — What's For Dinner?` : "Recipe link — What's For Dinner?",
    // Unlisted links are meant to be shared person-to-person, never crawled.
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const raw = await prisma.recipe.findFirst({
    where: { shareToken: token, shareRevokedAt: null },
  });

  if (!raw) {
    return (
      <main className="flex-1 flex items-center justify-center bg-amber-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 w-full max-w-sm text-center space-y-4">
          <span className="text-5xl block">🔗</span>
          <h1 className="text-xl font-bold text-gray-800">This link is no longer available</h1>
          <p className="text-sm text-gray-500">
            It may have been revoked, or the link isn&apos;t valid.
          </p>
          <Link href="/" className="inline-block text-sm text-orange-600 hover:text-orange-800 font-medium">
            Back to home →
          </Link>
        </div>
      </main>
    );
  }

  const recipe = parseRecipe(raw as Parameters<typeof parseRecipe>[0]);

  const session = await auth();
  const writableKitchensAll = session?.user?.id ? await getWritableKitchens() : [];
  // Pulling into the recipe's own kitchen would just create a duplicate
  // sitting next to the original — don't even offer it as a destination.
  const writableKitchens = writableKitchensAll.filter((k) => k.id !== raw.kitchenId);

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-6">
          Shared recipe
        </p>

        <RecipeHeader recipe={recipe} />
        <RecipeStatChips recipe={recipe} />

        {/* Call to action */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm px-5 py-4 mb-10">
          {session?.user?.id ? (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-2">Want this recipe?</p>
              <PullRecipeControl
                writableKitchens={writableKitchens}
                onPull={pullFromShareLink.bind(null, token)}
              />
              {writableKitchens.length === 0 && (
                <p className="text-sm text-gray-500">
                  {writableKitchensAll.length === 0
                    ? "You don't have Chef or Restaurateur access in any kitchen yet."
                    : "This recipe is already in the only kitchen you can pull into."}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-2">Like this recipe?</p>
              <Link
                href={`/login?callbackUrl=/share/${token}`}
                className="inline-block rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2.5 transition-colors"
              >
                Sign up to save this recipe →
              </Link>
            </>
          )}
        </div>

        <RecipeBody recipe={recipe} />
      </div>
    </div>
  );
}
