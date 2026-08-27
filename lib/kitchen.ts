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

// Returns the "primary" kitchenId for the current user (oldest membership).
// Used when we need to assign a recipe to exactly one kitchen (create/import).
export async function getKitchenId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.kitchenMembership.findFirst({
    where: { userId: session.user.id },
    orderBy: { kitchen: { createdAt: "asc" } },
    select: { kitchenId: true },
  });

  return membership?.kitchenId ?? null;
}
