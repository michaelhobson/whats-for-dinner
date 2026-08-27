import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // JWT strategy required for Edge-compatible middleware (Prisma adapter
  // can't run in the Edge runtime, so sessions stay in the token, not DB).
  session: { strategy: "jwt" },
  providers: [
    Resend({
      from: process.env.RESEND_FROM ?? "noreply@example.com",
    }),
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
