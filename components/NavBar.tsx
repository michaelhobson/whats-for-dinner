import Link from "next/link";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-orange-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-orange-800 text-lg hover:text-orange-600 transition-colors"
        >
          <span>🍽️</span>
          <span>What&apos;s For Dinner?</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/recipes"
            className="text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/recipes/new"
            className="text-sm font-semibold bg-orange-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-orange-700 transition-colors"
          >
            + Add Recipe
          </Link>
        </nav>
      </div>
    </header>
  );
}
