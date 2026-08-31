import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Use the Edge-compatible split config so the proxy doesn't pull in
// Prisma (a Node.js-only module). Full auth config lives in auth.ts.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on all paths EXCEPT Next.js internals, static files, and the auth
  // routes themselves (/login, /api/auth). Those must stay public so users
  // can reach the sign-in page and Auth.js can handle callbacks.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
};
