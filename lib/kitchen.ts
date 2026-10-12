import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGlobalPoolKitchenId } from "@/lib/global-pool";
import type { KitchenRole } from "@/app/generated/prisma/client";

const ACTIVE_KITCHEN_COOKIE = "active_kitchen_id";

// ── Active kitchen resolution ──────────────────────────────────────────────────
//
// Priority: explicit cookie (set by switchKitchen) → stored defaultKitchenId
//           → oldest KitchenMembership.
// The cookie is validated against the user's actual memberships on every read,
// so a tampered or stale value just falls through to the next priority.

export async function getActiveKitchenId(): Promise<number | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // 1. Cookie set by switchKitchen
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_KITCHEN_COOKIE)?.value;
  const fromCookie = raw ? parseInt(raw, 10) : null;
  if (fromCookie && !isNaN(fromCookie)) {
    const valid = await prisma.kitchenMembership.findFirst({
      where: { userId, kitchenId: fromCookie },
      select: { kitchenId: true },
    });
    if (valid) return valid.kitchenId;
  }

  // 2. User's stored default kitchen
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultKitchenId: true },
  });
  if (user?.defaultKitchenId) {
    const valid = await prisma.kitchenMembership.findFirst({
      where: { userId, kitchenId: user.defaultKitchenId },
      select: { kitchenId: true },
    });
    if (valid) return valid.kitchenId;
  }

  // 3. Oldest membership as final fallback
  const oldest = await prisma.kitchenMembership.findFirst({
    where: { userId },
    orderBy: { kitchen: { createdAt: "asc" } },
    select: { kitchenId: true },
  });
  return oldest?.kitchenId ?? null;
}

// ── Public helpers ─────────────────────────────────────────────────────────────

// The active kitchen, used by browse / randomizer for scoping, and by
// create/import actions so new recipes land in the right kitchen.
export async function getKitchenId(): Promise<number | null> {
  return getActiveKitchenId();
}

// Active kitchen as a single-element array — keeps the existing
// `{ kitchenId: { in: kitchenIds } }` query shape unchanged in page files.
// Browse page and randomizer use this; only the active kitchen's recipes show.
export async function getKitchenIds(): Promise<number[]> {
  const id = await getActiveKitchenId();
  return id ? [id] : [];
}

// ALL kitchen IDs the user belongs to — for ownership checks (edit/delete),
// recipe detail/edit page access, and the backup export.
export async function getAllKitchenIds(): Promise<number[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const memberships = await prisma.kitchenMembership.findMany({
    where: { userId },
    select: { kitchenId: true },
  });
  return memberships.map((m) => m.kitchenId);
}

// All kitchens the user belongs to with id + name, ordered oldest-first.
// Used by the KitchenSwitcher in the NavBar.
export async function getUserKitchens(): Promise<{ id: number; name: string }[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const memberships = await prisma.kitchenMembership.findMany({
    where: { userId },
    include: { kitchen: { select: { id: true, name: true } } },
    orderBy: { kitchen: { createdAt: "asc" } },
  });
  return memberships.map((m) => ({ id: m.kitchen.id, name: m.kitchen.name }));
}

// ── Role lookup ────────────────────────────────────────────────────────────────

// The current user's role in a SPECIFIC kitchen — never a global per-user role.
// Returns null if signed out or not a member of that kitchen.
export async function getKitchenRole(kitchenId: number): Promise<KitchenRole | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const membership = await prisma.kitchenMembership.findFirst({
    where: { userId, kitchenId },
    select: { role: true },
  });
  return membership?.role ?? null;
}

// Number of RESTAURATEUR members in a kitchen — used to enforce the
// at-least-one-Restaurateur invariant before a demotion/removal/departure.
export async function getRestaurateurCount(kitchenId: number): Promise<number> {
  return prisma.kitchenMembership.count({ where: { kitchenId, role: "RESTAURATEUR" } });
}

// Kitchens where the current user has Chef-or-above access — the set of
// valid destinations when pulling a recipe from the Global Pool.
export async function getWritableKitchens(): Promise<{ id: number; name: string }[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const memberships = await prisma.kitchenMembership.findMany({
    where: { userId, role: { in: ["RESTAURATEUR", "CHEF"] } },
    include: { kitchen: { select: { id: true, name: true } } },
    orderBy: { kitchen: { createdAt: "asc" } },
  });
  return memberships.map((m) => ({ id: m.kitchen.id, name: m.kitchen.name }));
}

// Kitchens whose recipes the current user may VIEW — their own kitchens plus
// the Global Pool, which is readable by anyone regardless of membership (the
// one deliberate visibility exception). Only for read paths like the recipe
// detail page — write actions keep using getAllKitchenIds().
export async function getReadableKitchenIds(): Promise<number[]> {
  const [ownKitchenIds, poolId] = await Promise.all([getAllKitchenIds(), getGlobalPoolKitchenId()]);
  return poolId && !ownKitchenIds.includes(poolId) ? [...ownKitchenIds, poolId] : ownKitchenIds;
}
