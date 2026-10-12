"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAllKitchenIds, getKitchenRole } from "@/lib/kitchen";
import { canEditRecipes } from "@/lib/permissions";
import { pullRecipeToKitchen } from "@/lib/global-pool";

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

// Confirms the recipe belongs to one of the caller's kitchens AND that their
// role there allows editing (Chef-or-above) — same gate as edit/delete.
async function getShareManageableRecipe(
  recipeId: number
): Promise<{ kitchenId: number } | { error: string }> {
  const kitchenIds = await getAllKitchenIds();
  if (kitchenIds.length === 0) return { error: "Not signed in." };

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, kitchenId: { in: kitchenIds } },
    select: { kitchenId: true },
  });
  if (!recipe || recipe.kitchenId == null) return { error: "Recipe not found." };

  const role = await getKitchenRole(recipe.kitchenId);
  if (!canEditRecipes(role)) {
    return { error: "Only a Chef or Restaurateur can create or revoke share links." };
  }

  return { kitchenId: recipe.kitchenId };
}

// ── Generate (or return the existing) share link ────────────────────────────────

export async function generateShareLink(
  recipeId: number
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const check = await getShareManageableRecipe(recipeId);
  if ("error" in check) return { ok: false, error: check.error };

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { shareToken: true, shareRevokedAt: true },
  });
  if (recipe?.shareToken && !recipe.shareRevokedAt) {
    return { ok: true, token: recipe.shareToken };
  }

  // Either no token yet, or the previous one was revoked — mint a fresh one.
  // Unique-constraint retry: astronomically unlikely to collide, but don't
  // let a one-in-a-trillion collision surface as a confusing 500.
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateToken();
    try {
      await prisma.recipe.update({
        where: { id: recipeId },
        data: { shareToken: token, shareRevokedAt: null },
      });
      revalidatePath(`/recipes/${recipeId}`);
      return { ok: true, token };
    } catch (e) {
      const isUniqueViolation =
        typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "P2002";
      if (!isUniqueViolation || attempt === 2) {
        return { ok: false, error: "Couldn't create a share link — please try again." };
      }
    }
  }

  return { ok: false, error: "Couldn't create a share link — please try again." };
}

// ── Revoke ───────────────────────────────────────────────────────────────────────

export async function revokeShareLink(
  recipeId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = await getShareManageableRecipe(recipeId);
  if ("error" in check) return { ok: false, error: check.error };

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { shareRevokedAt: new Date() },
  });

  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true };
}

// ── Pull from a share link ───────────────────────────────────────────────────────

export type PullFromShareResult =
  | { ok: true; status: "created" | "already_exists" }
  | { ok: false; error: string };

export async function pullFromShareLink(
  token: string,
  destinationKitchenId: number
): Promise<PullFromShareResult> {
  const recipe = await prisma.recipe.findFirst({
    where: { shareToken: token, shareRevokedAt: null },
    select: { id: true },
  });
  if (!recipe) return { ok: false, error: "This link is no longer available." };

  const role = await getKitchenRole(destinationKitchenId);
  if (!canEditRecipes(role)) {
    return { ok: false, error: "You need Chef or Restaurateur access in that kitchen to pull recipes into it." };
  }

  const result = await pullRecipeToKitchen(recipe.id, destinationKitchenId);
  if (result.status === "not_found") return { ok: false, error: "Recipe not found." };
  if (result.status === "same_kitchen") {
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: destinationKitchenId },
      select: { name: true },
    });
    return { ok: false, error: `This recipe is already in ${kitchen?.name ?? "that kitchen"}.` };
  }

  revalidatePath("/recipes");
  revalidatePath("/randomize");

  return { ok: true, status: result.status };
}
