"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendKitchenInvite, revokeKitchenInvite } from "@/app/actions/kitchen";

type PendingInvite = {
  id: number;
  invitedEmail: string;
  role: string;
  expiresAt: Date;
};

export function InviteSection({
  kitchenId,
  pendingInvites,
}: {
  kitchenId: number;
  pendingInvites: PendingInvite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"RESTAURATEUR" | "CHEF" | "DINER">("CHEF");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSendInvite() {
    if (!email.trim()) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await sendKitchenInvite(kitchenId, email.trim(), role);
      if ("error" in result) {
        setError(result.error);
      } else {
        setEmail("");
        setSuccess(`Invite sent to ${email.trim()}`);
        router.refresh();
      }
    });
  }

  function handleRevoke(inviteId: number, invitedEmail: string) {
    startTransition(async () => {
      await revokeKitchenInvite(inviteId);
      setSuccess(`Invite to ${invitedEmail} revoked.`);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pending Invites
          </h4>
          <ul className="space-y-1.5">
            {pendingInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 text-sm bg-orange-50 rounded-lg px-3 py-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-gray-700">{inv.invitedEmail}</span>
                  <span className="shrink-0 text-xs text-orange-600 font-medium bg-orange-100 px-1.5 py-0.5 rounded">
                    {inv.role.charAt(0) + inv.role.slice(1).toLowerCase()}
                  </span>
                </span>
                <button
                  onClick={() => handleRevoke(inv.id, inv.invitedEmail)}
                  disabled={isPending}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite form */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Invite someone
        </h4>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
            className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "RESTAURATEUR" | "CHEF" | "DINER")}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="RESTAURATEUR">Restaurateur</option>
            <option value="CHEF">Chef</option>
            <option value="DINER">Diner</option>
          </select>
          <button
            onClick={handleSendInvite}
            disabled={isPending || !email.trim()}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 transition-colors"
          >
            {isPending ? "Sending…" : "Send Invite"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </div>
    </div>
  );
}
