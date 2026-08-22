"use client";

import { useActionState, useRef } from "react";
import { importRecipes, ImportState } from "@/app/actions/import";

export function ImportButton() {
  const [state, formAction, isPending] = useActionState<ImportState, FormData>(
    importRecipes,
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              e.target.form?.requestSubmit();
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            // Reset the input so re-selecting the same file still triggers onChange
            if (fileRef.current) fileRef.current.value = "";
            fileRef.current?.click();
          }}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium transition-colors disabled:opacity-50"
        >
          <span className="text-lg">📥</span>
          {isPending ? "Importing…" : "Import Backup"}
        </button>
      </form>

      {state?.ok === true && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ Added {state.added} {state.added === 1 ? "recipe" : "recipes"},
          skipped {state.skipped} already present.
        </p>
      )}
      {state?.ok === false && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ✗ {state.error}
        </p>
      )}
    </div>
  );
}
