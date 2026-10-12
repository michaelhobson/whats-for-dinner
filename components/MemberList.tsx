"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeMemberRole, removeMember, leaveKitchen } from "@/app/actions/kitchen";

type Member = {
  userId: string;
  role: string;
  email: string;
  name: string | null;
};

const ROLES = ["RESTAURATEUR", "CHEF", "DINER"] as const;
const roleLabel: Record<string, string> = {
  RESTAURATEUR: "Restaurateur",
  CHEF: "Chef",
  DINER: "Diner",
};

export function MemberList({
  kitchenId,
  members,
  currentUserId,
  isRestaurateur,
}: {
  kitchenId: number;
  members: Member[];
  currentUserId: string;
  isRestaurateur: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const restaurateurCount = members.filter((m) => m.role === "RESTAURATEUR").length;

  function handleRoleChange(memberUserId: string, newRole: string) {
    setError(null);
    setBusyUserId(memberUserId);
    startTransition(async () => {
      const result = await changeMemberRole(kitchenId, memberUserId, newRole as "RESTAURATEUR" | "CHEF" | "DINER");
      if ("error" in result) setError(result.error);
      else router.refresh();
      setBusyUserId(null);
    });
  }

  function handleRemove(memberUserId: string, label: string) {
    if (!confirm(`Remove ${label} from this kitchen?`)) return;
    setError(null);
    setBusyUserId(memberUserId);
    startTransition(async () => {
      const result = await removeMember(kitchenId, memberUserId);
      if ("error" in result) setError(result.error);
      else router.refresh();
      setBusyUserId(null);
    });
  }

  function handleLeave() {
    if (!confirm("Leave this kitchen? You'll lose access to its recipes.")) return;
    setError(null);
    setBusyUserId(currentUserId);
    startTransition(async () => {
      const result = await leaveKitchen(kitchenId);
      if ("error" in result) setError(result.error);
      else router.refresh();
      setBusyUserId(null);
    });
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</h4>
      <ul className="space-y-1.5">
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const isSoleRestaurateur = m.role === "RESTAURATEUR" && restaurateurCount <= 1;
          const busy = isPending && busyUserId === m.userId;

          return (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-2 text-sm bg-orange-50 rounded-lg px-3 py-2"
            >
              <span className="min-w-0 truncate text-gray-700">
                {m.name ? `${m.name} ` : ""}
                <span className={m.name ? "text-gray-400" : ""}>{m.email}</span>
                {isSelf && <span className="text-xs text-gray-400"> (you)</span>}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                {isRestaurateur ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    disabled={busy || isSoleRestaurateur}
                    title={isSoleRestaurateur ? "Promote someone else to Restaurateur first" : undefined}
                    className="text-xs rounded border border-gray-300 bg-white text-gray-700 px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{roleLabel[r]}</option>
                    ))}
                  </select>
                ) : (
                  <span className="shrink-0 text-xs text-orange-600 font-medium bg-orange-100 px-1.5 py-0.5 rounded">
                    {roleLabel[m.role]}
                  </span>
                )}

                {isRestaurateur && !isSelf && (
                  <button
                    onClick={() => handleRemove(m.userId, m.name || m.email)}
                    disabled={busy || isSoleRestaurateur}
                    title={isSoleRestaurateur ? "Promote someone else to Restaurateur first" : undefined}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                  >
                    Remove
                  </button>
                )}

                {isSelf && (
                  <button
                    onClick={handleLeave}
                    disabled={busy || isSoleRestaurateur}
                    title={isSoleRestaurateur ? "Promote someone else to Restaurateur first" : undefined}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                  >
                    Leave
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
