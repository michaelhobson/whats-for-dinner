"use client";

import { useState } from "react";
import { InviteSection } from "./InviteSection";
import { MemberList } from "./MemberList";

const roleLabel: Record<string, string> = {
  RESTAURATEUR: "Restaurateur",
  CHEF: "Chef",
  DINER: "Diner",
};

type PendingInvite = {
  id: number;
  invitedEmail: string;
  role: string;
  expiresAt: Date;
};

type Member = {
  userId: string;
  role: string;
  email: string;
  name: string | null;
};

export function KitchenCard({
  kitchenId,
  kitchenName,
  role,
  memberCount,
  isDefault,
  isRestaurateur,
  currentUserId,
  members,
  pendingInvites,
}: {
  kitchenId: number;
  kitchenName: string;
  role: string;
  memberCount: number;
  isDefault: boolean;
  isRestaurateur: boolean;
  currentUserId: string;
  members: Member[];
  pendingInvites: PendingInvite[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
      {/* Summary row — always visible; acts as the expand/collapse trigger.
          Every role can expand to view the member list; only Restaurateurs
          get the management controls inside. */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-orange-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{kitchenName}</span>
            {isDefault && (
              <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-full">
                Default
              </span>
            )}
            {isRestaurateur && pendingInvites.length > 0 && !expanded && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                {pendingInvites.length} pending{" "}
                {pendingInvites.length === 1 ? "invite" : "invites"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {roleLabel[role]} ·{" "}
            {memberCount === 1 ? "1 member" : `${memberCount} members`}
          </p>
        </div>
        <span
          className={`shrink-0 text-gray-400 text-lg transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>

      {/* Expandable detail — member list for everyone; invites for Restaurateurs only */}
      {expanded && (
        <div className="border-t border-orange-100 px-5 pb-5 pt-4 space-y-4">
          <MemberList
            kitchenId={kitchenId}
            members={members}
            currentUserId={currentUserId}
            isRestaurateur={isRestaurateur}
          />
          {isRestaurateur && (
            <InviteSection kitchenId={kitchenId} pendingInvites={pendingInvites} />
          )}
        </div>
      )}
    </div>
  );
}
