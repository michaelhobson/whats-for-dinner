import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptInvite } from "@/app/actions/kitchen";

export const metadata = { title: "Accept Invitation — What's For Dinner?" };

function InviteMessage({
  emoji,
  heading,
  body,
  action,
}: {
  emoji: string;
  heading: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 w-full max-w-sm text-center space-y-4">
        <span className="text-5xl block">{emoji}</span>
        <h1 className="text-xl font-bold text-gray-800">{heading}</h1>
        <p className="text-sm text-gray-500">{body}</p>
        {action ?? (
          <Link href="/" className="inline-block text-sm text-orange-600 hover:text-orange-800 font-medium">
            Back to home →
          </Link>
        )}
      </div>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  // Look up the invite
  const invite = await prisma.kitchenInvite.findUnique({
    where: { token },
    include: { kitchen: { select: { name: true } }, invitedBy: { select: { email: true } } },
  });

  if (!invite) {
    return (
      <InviteMessage
        emoji="🔍"
        heading="Invite not found"
        body="This invite link is invalid or has already been removed."
      />
    );
  }

  if (invite.status === "ACCEPTED") {
    return (
      <InviteMessage
        emoji="✅"
        heading="Already accepted"
        body={`This invite to ${invite.kitchen.name} has already been used.`}
      />
    );
  }

  if (invite.status === "REVOKED") {
    return (
      <InviteMessage
        emoji="🚫"
        heading="Invite revoked"
        body={`This invite to ${invite.kitchen.name} was revoked by the kitchen owner.`}
      />
    );
  }

  // Check expiry (also covers status === "EXPIRED")
  if (invite.expiresAt < new Date() || invite.status === "EXPIRED") {
    if (invite.status === "PENDING") {
      await prisma.kitchenInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    }
    return (
      <InviteMessage
        emoji="⏰"
        heading="Invite expired"
        body={`This invite to ${invite.kitchen.name} expired. Ask a Restaurateur to send a new one.`}
      />
    );
  }

  // PENDING and not expired — do we have the right user logged in?
  if (!session?.user) {
    // Not logged in: send them to login with a callbackUrl back here
    redirect(`/login?callbackUrl=/invite/${token}`);
  }

  const userEmail = session.user.email ?? "";
  if (userEmail.toLowerCase() !== invite.invitedEmail) {
    return (
      <InviteMessage
        emoji="📧"
        heading="Wrong account"
        body={`This invite is for ${invite.invitedEmail}. You're signed in as ${userEmail}. Please sign in with the correct account.`}
      />
    );
  }

  // Accept the invite
  const result = await acceptInvite(token);
  if ("error" in result) {
    return (
      <InviteMessage
        emoji="❌"
        heading="Something went wrong"
        body={result.error}
      />
    );
  }

  // Success!
  return (
    <main className="flex-1 flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 w-full max-w-sm text-center space-y-4">
        <span className="text-5xl block">🎉</span>
        <h1 className="text-xl font-bold text-gray-800">Welcome to {invite.kitchen.name}!</h1>
        <p className="text-sm text-gray-500">
          You&apos;ve been added as{" "}
          <strong>{invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}</strong>.
          Start browsing the kitchen&apos;s recipes.
        </p>
        <Link
          href="/recipes"
          className="inline-block rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2.5 transition-colors"
        >
          Go to Cookbook →
        </Link>
      </div>
    </main>
  );
}
