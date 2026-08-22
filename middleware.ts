import { NextRequest, NextResponse } from "next/server";

// Must match the same logic as makeToken() in app/actions/auth.ts
async function makeToken(passcode: string): Promise<string> {
  const encoded = new TextEncoder().encode(passcode);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const passcode = process.env.PASSCODE;
  // If no passcode is configured, allow everything through (dev convenience)
  if (!passcode) return NextResponse.next();

  const expected = await makeToken(passcode);
  const cookie = request.cookies.get("wfd_auth")?.value;

  if (cookie === expected) return NextResponse.next();

  // Redirect to login, preserving the page the user tried to visit
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static files, and the login page itself
    "/((?!_next/static|_next/image|favicon.ico|login).*)",
  ],
};
