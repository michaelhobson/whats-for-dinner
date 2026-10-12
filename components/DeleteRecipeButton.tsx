"use client";

import { useState, useTransition } from "react";
import { deleteRecipe } from "@/app/actions/recipes";

export function DeleteRecipeButton({ id, name }: { id: number; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", String(id));
      const result = await deleteRecipe(fd);
      if (result && "error" in result) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-red-600 max-w-[200px] text-right">{error}</p>}
    </div>
  );
}
