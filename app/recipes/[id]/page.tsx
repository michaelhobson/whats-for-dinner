import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseRecipe } from "@/lib/recipe-utils";
import { getReadableKitchenIds, getKitchenRole } from "@/lib/kitchen";
import { canEditRecipes } from "@/lib/permissions";
import { getGlobalPoolKitchenId } from "@/lib/global-pool";
import { markCooked } from "@/app/actions/recipes";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { RatingWidget } from "@/components/RatingWidget";
import { NotesEditor } from "@/components/NotesEditor";
import { ShareRecipeButton } from "@/components/ShareRecipeButton";
import { RecipeHeader, RecipeStatChips, RecipeBody } from "@/components/RecipeDetailView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kitchenIds = await getReadableKitchenIds();
  const raw = kitchenIds.length
    ? await prisma.recipe.findFirst({
        where: { id: Number(id), kitchenId: { in: kitchenIds } },
        select: { name: true },
      })
    : null;
  return { title: raw ? `${raw.name} — What's For Dinner?` : "Recipe not found" };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const kitchenIds = await getReadableKitchenIds();

  const [raw, cookLogs] = await Promise.all([
    kitchenIds.length
      ? prisma.recipe.findFirst({ where: { id: numId, kitchenId: { in: kitchenIds } } })
      : Promise.resolve(null),
    prisma.cookLog.findMany({
      where: { recipeId: numId },
      orderBy: { cookedAt: "desc" },
    }),
  ]);
  if (!raw) notFound();

  const recipe = parseRecipe(raw as Parameters<typeof parseRecipe>[0]);

  // Check the role in THIS recipe's own kitchen — the user may be viewing a
  // recipe from a kitchen other than their currently-active one.
  const role = raw.kitchenId != null ? await getKitchenRole(raw.kitchenId) : null;
  const canEdit = canEditRecipes(role);

  // A Global Pool recipe is reachable by non-members too (the one visibility
  // exception) — send "back" to the pool browse page instead of a Cookbook
  // they may not even be a member of.
  const poolId = await getGlobalPoolKitchenId();
  const isPoolRecipe = raw.kitchenId != null && raw.kitchenId === poolId;
  const backHref = isPoolRecipe ? "/global-pool" : "/recipes";
  const backLabel = isPoolRecipe ? "Global Pool" : "Cookbook";

  // Rating/notes/cook-history/share-link-viewing are per-kitchen-member
  // actions (any role) — not for outsiders browsing a Global Pool recipe via
  // the visibility exception.
  const isMember = role !== null;

  const cookCount = cookLogs.length;
  const lastCooked = cookLogs[0]?.cookedAt ?? null;
  const activeShareToken = raw.shareToken && !raw.shareRevokedAt ? raw.shareToken : null;

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back + action buttons */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors"
          >
            ← {backLabel}
          </Link>
          {isMember && (
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Link
                    href={`/recipes/${numId}/edit`}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    Edit
                  </Link>
                  <DeleteRecipeButton id={numId} name={recipe.name} />
                </>
              )}
              <ShareRecipeButton recipeId={numId} initialToken={activeShareToken} canManage={canEdit} />
            </div>
          )}
        </div>

        <RecipeHeader recipe={recipe} />

        {/* Rating — kitchen members only */}
        {isMember && (
          <div className="mb-5">
            <RatingWidget recipeId={numId} rating={recipe.rating} />
          </div>
        )}

        <RecipeStatChips recipe={recipe} />

        {/* Cook history + mark as cooked — kitchen members only */}
        {isMember && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10 bg-white rounded-2xl border border-orange-100 shadow-sm px-5 py-4">
            <div className="text-sm text-gray-600">
              {cookCount === 0 ? (
                <span className="text-gray-400 italic">Never made yet</span>
              ) : (
                <>
                  <span className="font-semibold text-gray-800">
                    Cooked {cookCount} {cookCount === 1 ? "time" : "times"}
                  </span>
                  {lastCooked && (
                    <span className="text-gray-400">
                      {" · "}Last made{" "}
                      {lastCooked.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </>
              )}
            </div>
            <form action={markCooked}>
              <input type="hidden" name="id" value={numId} />
              <button
                type="submit"
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
              >
                ✓ Mark as Cooked
              </button>
            </form>
          </div>
        )}

        <RecipeBody recipe={recipe} />

        {/* Notes — kitchen members only */}
        {isMember && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-orange-100">Notes</h2>
            <NotesEditor recipeId={numId} initialNotes={recipe.notes} />
          </div>
        )}
      </div>
    </div>
  );
}
