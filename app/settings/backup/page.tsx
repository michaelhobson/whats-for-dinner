import Link from "next/link";
import { ImportButton } from "@/components/ImportButton";

export const metadata = { title: "Backup & Restore — What's For Dinner?" };

export default function BackupPage() {
  return (
    <div className="flex-1 bg-orange-50">
    <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/settings" className="text-sm text-orange-600 hover:text-orange-800 transition-colors">
          ← Settings
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-orange-700">Backup &amp; Restore</h1>

      {/* Backup */}
      <section className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Backup</h2>
        <p className="text-sm text-gray-500">
          Download all your recipes as a JSON file. Includes ingredients,
          directions, cook history, ratings, and notes.
        </p>
        <a
          href="/api/export"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
        >
          <span className="text-lg">📤</span>
          Download Backup
        </a>
      </section>

      {/* Restore */}
      <section className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Restore</h2>
        <p className="text-sm text-gray-500">
          Import a backup file to restore recipes. Existing recipes are never
          overwritten — only recipes whose names aren&apos;t already in the
          database will be added.
        </p>
        <ImportButton />
      </section>
    </main>
    </div>
  );
}
