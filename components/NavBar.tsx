import Link from "next/link";
import { auth } from "@/auth";
import { getActiveKitchenId, getUserKitchens } from "@/lib/kitchen";
import { KitchenSwitcher } from "./KitchenSwitcher";
import { OverflowMenu } from "./OverflowMenu";

export default async function NavBar() {
  const session = await auth();

  // For logged-out users the proxy handles the redirect; just render the logo.
  const [kitchens, activeKitchenId] = session?.user?.id
    ? await Promise.all([getUserKitchens(), getActiveKitchenId()])
    : [[], null];

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-orange-100 shadow-sm">
      {/*
        Two-section flex layout:
          Left  (min-w-0, can shrink) — logo + kitchen switcher
          Right (shrink-0, fixed)     — Add, Randomize, overflow menu
        The kitchen switcher truncates when viewport is narrow rather than
        pushing the action buttons off-screen.
      */}
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* ── Left: logo + kitchen switcher ── */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold text-orange-800 text-lg hover:text-orange-600 transition-colors shrink-0"
          >
            <span>🍽️</span>
            <span className="hidden sm:inline">What&apos;s For Dinner?</span>
          </Link>

          {kitchens.length > 0 && (
            <>
              <div className="w-px h-5 bg-orange-200 shrink-0" aria-hidden />
              {/*
                Width cap grows with viewport so the switcher truncates gracefully
                on narrow phones instead of squishing the action buttons.
              */}
              <div className="min-w-0 max-w-[80px] sm:max-w-[160px]">
                <KitchenSwitcher kitchens={kitchens} activeKitchenId={activeKitchenId} />
              </div>
            </>
          )}
        </div>

        {/* ── Right: action buttons (never squished) ── */}
        {session && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Add Recipe — secondary / outlined */}
            <Link
              href="/recipes/new"
              className="rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-colors"
            >
              + Add
            </Link>

            {/* Randomize — primary / filled, most prominent */}
            <Link
              href="/randomize"
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
            >
              🎲 Randomize
            </Link>

            {/* Overflow menu (Browse, Settings, Sign Out) */}
            <OverflowMenu userEmail={session.user?.email ?? undefined} />
          </div>
        )}
      </div>
    </header>
  );
}
