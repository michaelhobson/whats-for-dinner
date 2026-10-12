"use client";

import { useState, useTransition } from "react";

export type WritableKitchen = { id: number; name: string };
export type PullOutcome =
  | { ok: true; status: "created" | "already_exists" }
  | { ok: false; error: string };

// Shared "pull to my kitchen" control — same kitchen-picker, same lineage,
// same already-in-this-kitchen handling, wherever a recipe can be pulled
// from (the Global Pool browse grid, a public share page). The caller
// supplies onPull so this component stays agnostic to WHERE the recipe is
// being pulled from.
export function PullRecipeControl({
  writableKitchens,
  alreadyPulled = false,
  onPull,
  compact = false,
}: {
  writableKitchens: WritableKitchen[];
  // Precomputed only when there's exactly one writable kitchen — cheap to
  // check up front and lets us skip a pointless round-trip.
  alreadyPulled?: boolean;
  onPull: (destinationKitchenId: number) => Promise<PullOutcome>;
  compact?: boolean;
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
  const textSize = compact ? "text-xs" : "text-sm";
  const padY = compact ? "py-1.5" : "py-2";

  function handlePull() {
    if (!selectedKitchenId) return;
    const kitchen = writableKitchens.find((k) => k.id === selectedKitchenId);
    setError(null);
    startTransition(async () => {
      const result = await onPull(selectedKitchenId);
      if (result.ok) {
        setLastResult({ kitchenName: kitchen?.name ?? "your kitchen", status: result.status });
      } else {
        setLastResult(null);
        setError(result.error);
      }
    });
  }

  if (writableKitchens.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Single writable kitchen: a button, or a done state once pulled */}
      {singleKitchen && lastResult && (
        <p className={`${textSize} text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 ${padY} text-center`}>
          Already in this kitchen
        </p>
      )}
      {singleKitchen && !lastResult && (
        <button
          onClick={handlePull}
          disabled={isPending}
          className={`w-full rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white ${textSize} font-semibold px-3 ${padY} transition-colors`}
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
            className={`flex-1 min-w-0 ${textSize} rounded-lg border border-gray-300 bg-white text-gray-700 px-2 ${padY} focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50`}
          >
            {writableKitchens.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
          <button
            onClick={handlePull}
            disabled={isPending || !selectedKitchenId}
            className={`shrink-0 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white ${textSize} font-semibold px-3 ${padY} transition-colors whitespace-nowrap`}
          >
            {isPending ? "Pulling…" : compact ? "Pull" : "Pull to my kitchen"}
          </button>
        </div>
      )}

      {!singleKitchen && lastResult && (
        <p
          className={`${textSize} rounded-lg px-3 ${padY} text-center border ${
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

      {error && <p className={`${textSize} text-red-600 text-center`}>{error}</p>}
    </div>
  );
}
