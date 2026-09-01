import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KitchenCard } from "@/components/KitchenCard";
import { notFound } from "next/navigation";

export const metadata = { title: "Settings — What's For Dinner?" };

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const [memberships, user] = await Promise.all([
    prisma.kitchenMembership.findMany({
      where: { userId },
      include: {
        kitchen: {
          include: {
            memberships: { select: { userId: true, role: true } },
            invites: {
              where: { status: "PENDING" },
              orderBy: { createdAt: "desc" },
              select: { id: true, invitedEmail: true, role: true, expiresAt: true },
            },
          },
        },
      },
      orderBy: { kitchen: { createdAt: "asc" } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { defaultKitchenId: true, email: true },
    }),
  ]);

  return (
    <div className="flex-1 bg-orange-50">
      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-orange-700">Settings</h1>

        {/* ── Create a Kitchen ── */}
        <Link
          href="/settings/create-kitchen"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-3 transition-colors"
        >
          <span className="text-lg">🍳</span>
          Create a Kitchen
        </Link>

        {/* ── Your Kitchens — collapsible cards ── */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Your Kitchens</h2>
          {memberships.map(({ kitchen, role }) => (
            <KitchenCard
              key={kitchen.id}
              kitchenId={kitchen.id}
              kitchenName={kitchen.name}
              role={role as string}
              memberCount={kitchen.memberships.length}
              isDefault={kitchen.id === user?.defaultKitchenId}
              isRestaurateur={role === "RESTAURATEUR"}
              pendingInvites={kitchen.invites.map((inv) => ({
                ...inv,
                role: inv.role as string,
                expiresAt: new Date(inv.expiresAt),
              }))}
            />
          ))}
        </section>

        {/* ── Backup / Restore ── */}
        <Link
          href="/settings/backup"
          className="flex items-center gap-3 w-full rounded-xl bg-white border border-orange-100 shadow-sm hover:border-orange-300 px-5 py-4 transition-colors"
        >
          <span className="text-2xl">📚</span>
          <div>
            <p className="font-semibold text-gray-800">Backup / Restore Cookbook</p>
            <p className="text-sm text-gray-500">Download a backup or import a JSON file</p>
          </div>
          <span className="ml-auto text-gray-400">›</span>
        </Link>
      </main>
    </div>
  );
}
