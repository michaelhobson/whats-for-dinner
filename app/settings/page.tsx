import { ImportButton } from "@/components/ImportButton";

export const metadata = { title: "Settings — What's For Dinner?" };

export default function SettingsPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-orange-700">Settings</h1>

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
  );
}
