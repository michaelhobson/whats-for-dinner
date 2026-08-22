"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthState = { error: string } | null;

// SHA-256 of the passcode — stored in the cookie instead of the plaintext value
async function makeToken(passcode: string): Promise<string> {
  const encoded = new TextEncoder().encode(passcode);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const entered = ((formData.get("passcode") as string) ?? "").trim();
  const passcode = process.env.PASSCODE;

  if (!passcode) throw new Error("PASSCODE environment variable is not configured.");
  if (entered !== passcode) return { error: "Incorrect passcode." };

  const token = await makeToken(passcode);
  const cookieStore = await cookies();
  cookieStore.set("wfd_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Redirect to the page the user originally tried to visit, or home
  const from = (formData.get("from") as string | null) ?? "/";
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}
