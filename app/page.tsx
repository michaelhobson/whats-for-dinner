import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-orange-50 px-4">
      <main className="flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-6xl">🍽️</span>
          <h1 className="text-5xl font-bold tracking-tight text-orange-900">
            What&apos;s For Dinner?
          </h1>
          <p className="text-lg text-orange-700">
            Your personal recipe database and dinner decider.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          {/* Primary CTA — the whole point of the app */}
          <Link
            href="/randomize"
            className="w-full rounded-xl bg-orange-600 px-8 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-orange-700 text-center"
          >
            🎲 Pick Something!
          </Link>

          {/* Secondary actions */}
          <div className="flex gap-3 w-full">
            <Link
              href="/recipes"
              className="flex-1 rounded-xl border-2 border-orange-600 px-5 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 text-center"
            >
              Browse Recipes
            </Link>
            <Link
              href="/recipes/new"
              className="flex-1 rounded-xl border-2 border-orange-600 px-5 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 text-center"
            >
              Add a Recipe
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
