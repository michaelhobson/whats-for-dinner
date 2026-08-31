import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getActiveKitchenId, getUserKitchens } from "@/lib/kitchen";
import { KitchenSwitcher } from "./KitchenSwitcher";

export default async function NavBar() {
  const session = await auth();

  // Fetch kitchen data for logged-in users — both calls share the cached session
  const [kitchens, activeKitchenId] = session?.user?.id
    ? await Promise.all([getUserKitchens(), getActiveKitchenId()])
    : [[], null];

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-orange-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Left: logo + kitchen switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-orange-800 text-lg hover:text-orange-600 transition-colors shrink-0"
          >
            <span>🍽️</span>
            <span className="hidden lg:inline">What&apos;s For Dinner?</span>
          </Link>

          {kitchens.length > 0 && (
            <>
              <div className="w-px h-5 bg-orange-200 shrink-0" aria-hidden />
              <div className="min-w-0">
                <KitchenSwitcher kitchens={kitchens} activeKitchenId={activeKitchenId} />
              </div>
            </>
          )}
        </div>

        {/* Right: nav actions — only shown when signed in */}
        {session && (
          <nav className="flex items-center gap-3 shrink-0">
            <Link
              href="/randomize"
              className="text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors hidden sm:inline"
            >
              🎲 Randomize
            </Link>
            <Link
              href="/recipes"
              className="text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors hidden sm:inline"
            >
              Browse
            </Link>
            <Link
              href="/recipes/new"
              className="text-sm font-semibold bg-orange-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-orange-700 transition-colors"
            >
              + Add
            </Link>

            {/* Settings icon */}
            <Link
              href="/settings"
              className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-700 transition-colors px-2 py-1 rounded-md hover:bg-orange-50"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .205 1.251l-1.18 2.044a1 1 0 0 1-1.186.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.113a7.047 7.047 0 0 1 0-2.228L1.821 7.773a1 1 0 0 1-.205-1.251l1.18-2.044a1 1 0 0 1 1.186-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
              <span className="hidden md:inline text-xs font-medium">Settings</span>
            </Link>

            {/* Divider before sign-out */}
            <div className="w-px h-5 bg-orange-200" aria-hidden />

            {/* Sign-out */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                title={`Sign out (${session.user?.email ?? ""})`}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
              >
                Sign out
              </button>
            </form>
          </nav>
        )}

      </div>
    </header>
  );
}
