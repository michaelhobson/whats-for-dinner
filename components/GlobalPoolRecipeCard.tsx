"use client";

import { useState, useTransition } from "react";
import RecipeCard from "@/components/RecipeCard";
import { pullRecipe } from "@/app/actions/global-pool";
import { ParsedRecipe } from "@/lib/recipe-utils";

type WritableKitchen = { id: number; name: string };

export function GlobalPoolRecipeCard({
  recipe,
  writableKitchens,
  alreadyPulled,
}: {
  recipe: ParsedRecipe;
  writableKitchens: WritableKitchen[];
  // Precomputed only when there's exactly one writable kitchen — cheap to
  // check up front and lets us skip a pointless round-trip.
  alreadyPulled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedKitchenId, setSelectedKitchenId] = useState<number | null>(
    writableKitchens[0]?.id ?? null
  );
  const [lastResult, setLastResult] = useState<
    { kitchenName: string; status: "created" | "already_exists" } | null
  >(
    writableKitchens.length === 1 && alreadyPulled
      ? { kitchenName: writableKitchens[0].name, status: "already_exists" }
      : null
  );
  const [error, setError] = useState<string | null>(null);

  const singleKitchen = writableKitchens.length === 1;

  function handlePull() {
    if (!selectedKitchenId) return;
    const kitchen = writableKitchens.find((k) => k.id === selectedKitchenId);
    setError(null);
    startTransition(async () => {
      const result = await pullRecipe(recipe.id, selectedKitchenId);
      if (result.ok) {
        setLastResult({ kitchenName: kitchen?.name ?? "your kitchen", status: result.status });
      } else {
        setLastResult(null);
        setError(result.error);
      }
    });
  }

  if (writableKitchens.length === 0) {
    return <RecipeCard recipe={recipe} />;
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <RecipeCard recipe={recipe} />

      <div className="px-1 space-y-1.5">
        {/* Single writable kitchen: a button, or a done state once pulled */}
        {singleKitchen && lastResult && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-center">
            Already in this kitchen
          </p>
        )}
        {singleKitchen && !lastResult && (
          <button
            onClick={handlePull}
            disabled={isPending}
            className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            {isPending ? "Pulling…" : "Pull to my kitchen"}
          </button>
        )}

        {/* Multiple writable kitchens: pick a destination, can pull into more than one */}
        {!singleKitchen && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedKitchenId ?? ""}
              onChange={(e) => setSelectedKitchenId(Number(e.target.value))}
              disabled={isPending}
              className="flex-1 min-w-0 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
            >
              {writableKitchens.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <button
              onClick={handlePull}
              disabled={isPending || !selectedKitchenId}
              className="shrink-0 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              {isPending ? "Pulling…" : "Pull"}
            </button>
          </div>
        )}

        {!singleKitchen && lastResult && (
          <p
            className={`text-xs rounded-lg px-3 py-1.5 text-center border ${
              lastResult.status === "created"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-gray-500 bg-gray-50 border-gray-200"
            }`}
          >
            {lastResult.status === "created"
              ? `✓ Added to ${lastResult.kitchenName}`
              : `Already in ${lastResult.kitchenName}`}
          </p>
        )}

        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
}
