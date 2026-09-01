import Link from "next/link";

export const metadata = { title: "Settings — What's For Dinner?" };

export default function SettingsPage() {
  return (
    <div className="flex-1 bg-orange-50">
      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-orange-700">Settings</h1>

        <div className="space-y-3">
          <Link
            href="/settings/kitchens"
            className="flex items-center gap-3 w-full rounded-xl bg-white border border-orange-100 shadow-sm hover:border-orange-300 px-5 py-4 transition-colors"
          >
            <span className="text-2xl">🍳</span>
            <div>
              <p className="font-semibold text-gray-800">Kitchens</p>
              <p className="text-sm text-gray-500">Manage your kitchens and invite members</p>
            </div>
            <span className="ml-auto text-gray-400">›</span>
          </Link>

          <Link
            href="/settings/backup"
            className="flex items-center gap-3 w-full rounded-xl bg-white border border-orange-100 shadow-sm hover:border-orange-300 px-5 py-4 transition-colors"
          >
            <span className="text-2xl">📚</span>
            <div>
              <p className="font-semibold text-gray-800">Backup / Restore Cookbook</p>
              <p className="text-sm text-gray-500">Download a backup or import a JSON file</p>
            </div>
            <span className="ml-auto text-gray-400">›</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
