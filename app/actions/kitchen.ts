"use server";

import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { KitchenRole } from "@/app/generated/prisma/client";

const ACTIVE_KITCHEN_COOKIE = "active_kitchen_id";

// ── Switch active kitchen ──────────────────────────────────────────────────────

export async function switchKitchen(
  kitchenId: number,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not signed in." };

  const membership = await prisma.kitchenMembership.findFirst({
    where: { userId, kitchenId },
  });
  if (!membership) return { error: "You are not a member of this kitchen." };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_KITCHEN_COOKIE, String(kitchenId), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getSiteBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  kitchenName: string,
  inviterEmail: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const from = process.env.RESEND_FROM ?? "noreply@example.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: `You've been invited to ${kitchenName} on What's For Dinner?`,
      html: inviteEmailHtml(inviteUrl, kitchenName, inviterEmail),
      text: inviteEmailText(inviteUrl, kitchenName, inviterEmail),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error("Resend error: " + JSON.stringify(err));
  }
}

function inviteEmailHtml(inviteUrl: string, kitchenName: string, inviterEmail: string) {
  return `<body style="background:#f9f9f9;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background:#fff;max-width:600px;margin:auto;border-radius:10px">
    <tr><td align="center" style="padding:10px 0;font-size:22px;color:#444">
      You&rsquo;ve been invited to <strong>${kitchenName}</strong>
    </td></tr>
    <tr><td style="padding:0 20px;font-size:15px;color:#555">
      <p>${inviterEmail} invited you to join <strong>${kitchenName}</strong> on
        <strong>What&rsquo;s For Dinner?</strong> — a shared recipe collection.</p>
    </td></tr>
    <tr><td align="center" style="padding:20px 0">
      <a href="${inviteUrl}" target="_blank"
        style="font-size:18px;color:#fff;text-decoration:none;border-radius:5px;
               padding:10px 20px;background:#ea580c;display:inline-block;font-weight:bold">
        Accept Invitation
      </a>
    </td></tr>
    <tr><td align="center" style="padding:0 0 10px;font-size:13px;color:#888">
      This invitation expires in 7 days. If you didn&rsquo;t expect this email you can safely ignore it.
    </td></tr>
  </table>
</body>`;
}

function inviteEmailText(inviteUrl: string, kitchenName: string, inviterEmail: string) {
  return `${inviterEmail} invited you to join "${kitchenName}" on What's For Dinner?\n\nAccept the invitation:\n${inviteUrl}\n\nThis invitation expires in 7 days.\n`;
}

// ── Create Kitchen ─────────────────────────────────────────────────────────────

export async function createKitchen(
  name: string,
): Promise<{ kitchenId: number } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Kitchen name cannot be empty." };

  const kitchen = await prisma.kitchen.create({ data: { name: trimmed } });
  await prisma.kitchenMembership.create({
    data: { userId, kitchenId: kitchen.id, role: "RESTAURATEUR" },
  });

  revalidatePath("/settings");
  return { kitchenId: kitchen.id };
}

// ── Set Default Kitchen ────────────────────────────────────────────────────────

export async function setDefaultKitchen(
  kitchenId: number,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not signed in." };

  // Verify the user is a member of this kitchen
  const membership = await prisma.kitchenMembership.findFirst({
    where: { userId, kitchenId },
  });
  if (!membership) return { error: "You are not a member of this kitchen." };

  await prisma.user.update({
    where: { id: userId },
    data: { defaultKitchenId: kitchenId },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ── Send Kitchen Invite ────────────────────────────────────────────────────────

export async function sendKitchenInvite(
  kitchenId: number,
  invitedEmail: string,
  role: KitchenRole,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not signed in." };

  const membership = await prisma.kitchenMembership.findFirst({
    where: { userId, kitchenId, role: "RESTAURATEUR" },
    include: { kitchen: true },
  });
  if (!membership) return { error: "Only Restaurateurs can send invites." };

  const normalizedEmail = invitedEmail.trim().toLowerCase();

  // Don't invite yourself
  if (session.user?.email?.toLowerCase() === normalizedEmail) {
    return { error: "You can't invite yourself." };
  }

  // Check if the email is already a member
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const alreadyMember = await prisma.kitchenMembership.findFirst({
      where: { userId: existingUser.id, kitchenId },
    });
    if (alreadyMember) return { error: "This person is already a member of this kitchen." };
  }

  // Check for a pending invite to the same address
  const duplicate = await prisma.kitchenInvite.findFirst({
    where: { kitchenId, invitedEmail: normalizedEmail, status: "PENDING" },
  });
  if (duplicate) return { error: "There's already a pending invite for this address." };

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create invite record first, then send email — roll back on failure
  const invite = await prisma.kitchenInvite.create({
    data: { kitchenId, invitedEmail: normalizedEmail, role, token, invitedByUserId: userId, expiresAt },
  });

  const baseUrl = await getSiteBaseUrl();
  try {
    await sendInviteEmail(
      normalizedEmail,
      `${baseUrl}/invite/${token}`,
      membership.kitchen.name,
      session.user?.email ?? userId,
    );
  } catch {
    // Email failed — delete the invite so the user can retry cleanly
    await prisma.kitchenInvite.delete({ where: { id: invite.id } });
    return { error: "Failed to send the invite email. Check that RESEND_FROM is a verified domain." };
  }

  revalidatePath("/settings");
  return { success: true };
}

// ── Revoke Invite ──────────────────────────────────────────────────────────────

export async function revokeKitchenInvite(
  inviteId: number,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not signed in." };

  const invite = await prisma.kitchenInvite.findUnique({
    where: { id: inviteId },
    include: {
      kitchen: { include: { memberships: { where: { userId, role: "RESTAURATEUR" } } } },
    },
  });

  if (!invite) return { error: "Invite not found." };
  if (!invite.kitchen.memberships.length) return { error: "Only Restaurateurs can revoke invites." };
  if (invite.status !== "PENDING") return { error: "Only pending invites can be revoked." };

  await prisma.kitchenInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
  revalidatePath("/settings");
  return { success: true };
}

// ── Accept Invite (called from the invite page) ────────────────────────────────

export async function acceptInvite(
  token: string,
): Promise<{ success: true; kitchenId: number } | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) return { error: "You must be signed in to accept an invite." };

  const invite = await prisma.kitchenInvite.findUnique({
    where: { token },
    include: { kitchen: true },
  });

  if (!invite) return { error: "Invalid or expired invite link." };
  if (invite.status === "ACCEPTED") return { error: "This invite has already been accepted." };
  if (invite.status === "REVOKED") return { error: "This invite has been revoked." };
  if (invite.status === "EXPIRED" || invite.expiresAt < new Date()) {
    if (invite.status === "PENDING") {
      await prisma.kitchenInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    }
    return { error: "This invite has expired." };
  }

  if (invite.invitedEmail !== userEmail.toLowerCase()) {
    return { error: `This invite is for ${invite.invitedEmail}. You're signed in as ${userEmail}.` };
  }

  // Already a member (edge case)?
  const existing = await prisma.kitchenMembership.findFirst({
    where: { userId, kitchenId: invite.kitchenId },
  });
  if (!existing) {
    await prisma.kitchenMembership.create({
      data: { userId, kitchenId: invite.kitchenId, role: invite.role },
    });
  }

  await prisma.kitchenInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
  revalidatePath("/settings");
  return { success: true, kitchenId: invite.kitchenId };
}
