/**
 * Pure role-check helpers for the Kitchen permission model (docs/PERMISSIONS.md).
 * Role is per-KitchenMembership, never a global property of the user — always
 * pass the role for the SPECIFIC kitchen the action targets.
 */

import type { KitchenRole } from "@/app/generated/prisma/client";

// Recipe content — create/edit/delete, including URL/photo import and the
// bulk JSON backup import. Diners are read-only here.
export function canEditRecipes(role: KitchenRole | null): boolean {
  return role === "RESTAURATEUR" || role === "CHEF";
}

// Kitchen settings — invites, role changes, member removal, rename/delete.
// Restaurateur only; Chef and Diner get read-only access.
export function canManageKitchen(role: KitchenRole | null): boolean {
  return role === "RESTAURATEUR";
}
