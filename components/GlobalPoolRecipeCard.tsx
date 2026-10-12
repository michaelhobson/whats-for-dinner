"use client";

import RecipeCard from "@/components/RecipeCard";
import { PullRecipeControl, WritableKitchen } from "@/components/PullRecipeControl";
import { pullRecipe } from "@/app/actions/global-pool";
import { ParsedRecipe } from "@/lib/recipe-utils";

export function GlobalPoolRecipeCard({
  recipe,
  writableKitchens,
  alreadyPulled,
}: {
  recipe: ParsedRecipe;
  writableKitchens: WritableKitchen[];
  // Precomputed only when there's exactly one writable kitchen — cheap to
  // check up front and lets us skip a pointless round-trip.
  alreadyPulled: boolean;
}) {
  if (writableKitchens.length === 0) {
    return <RecipeCard recipe={recipe} />;
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <RecipeCard recipe={recipe} />
      <div className="px-1">
        <PullRecipeControl
          writableKitchens={writableKitchens}
          alreadyPulled={alreadyPulled}
          onPull={(destinationKitchenId) => pullRecipe(recipe.id, destinationKitchenId)}
          compact
        />
      </div>
    </div>
  );
}
