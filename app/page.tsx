import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-orange-50 px-4">
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

        <nav className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/recipes"
            className="rounded-xl bg-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-orange-700"
          >
            Browse Recipes
          </Link>
          <Link
            href="/recipes/new"
            className="rounded-xl border-2 border-orange-600 px-8 py-4 text-lg font-semibold text-orange-700 transition-colors hover:bg-orange-100"
          >
            Add a Recipe
          </Link>
        </nav>
      </main>
    </div>
  );
}
