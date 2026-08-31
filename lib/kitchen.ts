import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Returns ALL kitchenIds the current user belongs to.
// Use this for read and write scoping — supports multi-kitchen in the future.
export async function getKitchenIds(): Promise<number[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const memberships = await prisma.kitchenMembership.findMany({
    where: { userId: session.user.id },
    select: { kitchenId: true },
  });

  return memberships.map((m) => m.kitchenId);
}

// Returns the "primary" kitchenId for the current user.
// Prefers their defaultKitchenId (if set and still valid), falls back to oldest membership.
// Used when we need to assign a recipe to exactly one kitchen (create/import).
export async function getKitchenId(): Promise<number | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

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

  const membership = await prisma.kitchenMembership.findFirst({
    where: { userId },
    orderBy: { kitchen: { createdAt: "asc" } },
    select: { kitchenId: true },
  });
  return membership?.kitchenId ?? null;
}
