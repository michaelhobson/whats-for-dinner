import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

function signInEmailHtml(url: string, host: string): string {
  const escaped = host.replace(/\./g, "&#8203;.");
  return `<body style="background:#f9f9f9;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background:#fff;max-width:600px;margin:auto;border-radius:10px">
    <tr><td align="center" style="padding:10px 0;font-size:22px;color:#444">
      Sign in to <strong>${escaped}</strong>
    </td></tr>
    <tr><td align="center" style="padding:20px 0">
      <a href="${url}" target="_blank"
        style="font-size:18px;color:#fff;text-decoration:none;border-radius:5px;
               padding:10px 20px;background:#ea580c;display:inline-block;font-weight:bold">
        Sign in
      </a>
    </td></tr>
    <tr><td align="center" style="padding:0 0 10px;font-size:16px;color:#444">
      If you did not request this email you can safely ignore it.
    </td></tr>
  </table>
</body>`;
}

function signInEmailText(url: string, host: string): string {
  return `Sign in to ${host}\n${url}\n\n`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // JWT strategy required for Edge-compatible middleware (Prisma adapter
  // can't run in the Edge runtime, so sessions stay in the token, not DB).
  session: { strategy: "jwt" },
  providers: [
    {
      // Inline email provider so RESEND_API_KEY is read at send time, not at
      // module init. Auth.js's Resend() factory stores apiKey in provider.options
      // and the merge pipeline can silently drop it if the env var is undefined
      // at module load; reading it inside the function body avoids that entirely.
      id: "resend",
      type: "email",
      name: "Resend",
      from: process.env.RESEND_FROM ?? "noreply@example.com",
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ identifier: to, url, provider }) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          throw new Error(
            "RESEND_API_KEY environment variable is not set. " +
            "Add it to .env (locally) and to Vercel environment variables (production)."
          );
        }

        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to,
            subject: `Sign in to ${host}`,
            html: signInEmailHtml(url, host),
            text: signInEmailText(url, host),
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error("Resend error: " + JSON.stringify(error));
        }
      },
    },
  ],
  callbacks: {
    // Expose user.id on the client-visible session object.
    // token.sub is the user's database ID, set automatically by Auth.js.
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
  events: {
    // On first sign-in, assign the user to a Kitchen.
    // Founding members (listed in FOUNDING_KITCHEN_MEMBER_EMAILS) join the
    // pre-existing founding Kitchen; everyone else gets a new personal Kitchen.
    async createUser({ user }) {
      if (!user.id || !user.email) return;

      const foundingEmails = (process.env.FOUNDING_KITCHEN_MEMBER_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (foundingEmails.includes(user.email.toLowerCase())) {
        // Find the founding kitchen (oldest by createdAt)
        const founding = await prisma.kitchen.findFirst({
          orderBy: { createdAt: "asc" },
        });
        if (founding) {
          await prisma.kitchenMembership.create({
            data: { userId: user.id, kitchenId: founding.id, role: "RESTAURATEUR" },
          });
          return;
        }
        // Falls through if no founding kitchen exists yet — give them a personal one.
      }

      // Default: create a fresh personal Kitchen for the new user.
      const kitchen = await prisma.kitchen.create({ data: { name: "My Kitchen" } });
      await prisma.kitchenMembership.create({
        data: { userId: user.id, kitchenId: kitchen.id, role: "RESTAURATEUR" },
      });
    },
  },
});
