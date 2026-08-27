import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Node.js-only imports (no Prisma, no pg).
// Used by middleware; full config with the Prisma adapter lives in auth.ts.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  callbacks: {
    authorized({ auth }) {
      // Return true only when there is an active session.
      // The middleware matcher already excludes /login and /api/auth paths,
      // so this callback never runs for those routes.
      return !!auth?.user;
    },
  },
  providers: [], // populated in auth.ts
};
