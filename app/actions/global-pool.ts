"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getKitchenRole } from "@/lib/kitchen";
import { canEditRecipes } from "@/lib/permissions";
import { getGlobalPoolKitchenId, pullRecipeToKitchen } from "@/lib/global-pool";

export type PullRecipeResult =
  | { ok: true; status: "created" | "already_exists" }
  | { ok: false; error: string };

// "Pull to my kitchen" — copies a Global Pool recipe into a kitchen where the
// caller has Chef-or-above access. This action only reads FROM the Global
// Pool specifically; it isn't a generic cross-kitchen copy tool.
export async function pullRecipe(
  originalRecipeId: number,
  destinationKitchenId: number
): Promise<PullRecipeResult> {
  const poolId = await getGlobalPoolKitchenId();
  if (!poolId) return { ok: false, error: "The Global Pool hasn't been set up yet." };

  if (destinationKitchenId === poolId) {
    return { ok: false, error: "Choose a different kitchen to pull into." };
  }

  const original = await prisma.recipe.findFirst({
    where: { id: originalRecipeId, kitchenId: poolId },
    select: { id: true },
  });
  if (!original) return { ok: false, error: "Recipe not found in the Global Pool." };

  const role = await getKitchenRole(destinationKitchenId);
  if (!canEditRecipes(role)) {
    return { ok: false, error: "You need Chef or Restaurateur access in that kitchen to pull recipes into it." };
  }

  const result = await pullRecipeToKitchen(originalRecipeId, destinationKitchenId);
  if (result.status === "not_found") return { ok: false, error: "Recipe not found." };
  // Unreachable in practice — destinationKitchenId === poolId is already
  // rejected above, and the original is always a Global Pool recipe — but
  // handled explicitly rather than silently mis-typed.
  if (result.status === "same_kitchen") {
    return { ok: false, error: "This recipe is already in that kitchen." };
  }

  revalidatePath("/recipes");
  revalidatePath("/randomize");

  return { ok: true, status: result.status };
}
