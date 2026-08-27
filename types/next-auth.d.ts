import type { DefaultSession } from "next-auth";

// Extend the built-in session type to expose the user's database ID,
// which is set in the `session` callback in auth.ts via token.sub.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
