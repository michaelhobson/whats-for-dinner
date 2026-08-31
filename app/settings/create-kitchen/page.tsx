import Link from "next/link";
import { CreateKitchenWizard } from "./CreateKitchenWizard";

export const metadata = { title: "Create a Kitchen — What's For Dinner?" };

export default function CreateKitchenPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-orange-600 hover:text-orange-800 transition-colors">
          ← Settings
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-orange-700">Create a Kitchen</h1>
        <p className="text-sm text-gray-500 mt-1">
          A Kitchen is a shared recipe collection. Invite household members or friends to cook together.
        </p>
      </div>
      <CreateKitchenWizard />
    </main>
  );
}
