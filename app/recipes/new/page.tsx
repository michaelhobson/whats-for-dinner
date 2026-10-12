import { redirect } from "next/navigation";
import { getActiveKitchenId, getKitchenRole } from "@/lib/kitchen";
import { canEditRecipes } from "@/lib/permissions";
import { ImportAndCreateForm } from "./ImportAndCreateForm";

export const metadata = { title: "Add a Recipe — What's For Dinner?" };

export default async function NewRecipePage() {
  // Defense-in-depth for a direct URL hit — the "+ Add" entry points are
  // already hidden for Diners, but createRecipe also rejects the save.
  const activeKitchenId = await getActiveKitchenId();
  const role = activeKitchenId ? await getKitchenRole(activeKitchenId) : null;
  if (!canEditRecipes(role)) redirect("/recipes");

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Add a Recipe</h1>
        <ImportAndCreateForm />
      </div>
    </div>
  );
}
