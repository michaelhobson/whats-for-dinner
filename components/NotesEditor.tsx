"use client";

import { useState, useTransition } from "react";
import { updateNotes } from "@/app/actions/recipes";

export function NotesEditor({
  recipeId,
  initialNotes,
}: {
  recipeId: number;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isDirty = notes !== (initialNotes ?? "");
  const justSaved = savedAt != null && Date.now() - savedAt < 2500;

  const handleSave = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", String(recipeId));
      fd.set("notes", notes);
      await updateNotes(fd);
      setSavedAt(Date.now());
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSavedAt(null); }}
        placeholder="Any notes about this recipe — adjustments, tips, substitutions…"
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : "Save notes"}
        </button>
        {justSaved && (
          <span className="text-sm text-green-600 font-medium">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
