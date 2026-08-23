"use client";

import { useActionState } from "react";
import { importFromUrl, ImportUrlState } from "@/app/actions/import-url";
import { createRecipe } from "@/app/actions/recipes";
import AddRecipeForm from "./AddRecipeForm";
import { ParsedRecipe } from "@/lib/recipe-utils";

// Build a ParsedRecipe shell from import data so AddRecipeForm can use it.
// id=0 signals "create mode" (AddRecipeForm checks id > 0 for edit mode).
// Tag fields (mealType, cuisine, flavorNotes, season, cookingMethod) are left
// empty intentionally — the user fills those in manually after import.
function toInitialData(recipe: {
  name: string;
  ingredients: { name: string }[];
  directions: string[];
  prepTime: number | null;
  sourceUrl: string;
}): ParsedRecipe {
  return {
    id: 0,
    name: recipe.name,
    mainProtein: null,
    mainStarch: null,
    mainVegetable: null,
    ingredients: recipe.ingredients,
    directions: recipe.directions,
    favorite: false,
    dishCategory: null,
    difficulty: "medium",
    prepTime: recipe.prepTime ?? 30,
    mealType: [],
    cuisine: [],
    flavorNotes: [],
    season: [],
    cookingMethod: [],
    rating: null,
    notes: null,
    sourceUrl: recipe.sourceUrl,
    forkedFromRecipeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function ImportAndCreateForm() {
  const [importState, importAction, isImporting] = useActionState<
    ImportUrlState,
    FormData
  >(importFromUrl, null);

  const initialData = importState?.ok
    ? toInitialData(importState.recipe)
    : undefined;

  return (
    <div className="space-y-6">
      {/* ── URL import bar ── */}
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-600">
            Import from URL
          </h2>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-500">
            Paste a link to a recipe page and we&apos;ll pre-fill what we can
            find. You&apos;ll still review and fill in the tag fields before saving.
          </p>
          <form action={importAction} className="flex gap-2">
            <input
              type="url"
              name="url"
              placeholder="https://..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={isImporting}
              className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              {isImporting ? "Fetching…" : "Import"}
            </button>
          </form>

          {importState?.ok === false && (
            <p className="text-sm text-red-600">{importState.error}</p>
          )}
          {importState?.ok === true && (
            <p className="text-sm text-green-700">
              ✓ Recipe data found — form pre-filled below. Fill in the tag
              fields and save when ready.
            </p>
          )}
        </div>
      </div>

      {/* ── Add-recipe form (pre-filled on import, blank otherwise) ── */}
      {/* key remounts AddRecipeForm whenever a new URL is imported so
          controlled state (name, ingredients, directions) reinitialises */}
      <AddRecipeForm
        key={importState?.ok ? importState.recipe.sourceUrl : "__manual__"}
        serverAction={createRecipe}
        initialData={initialData}
      />
    </div>
  );
}
