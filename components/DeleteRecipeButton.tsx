"use client";

import { useTransition } from "react";
import { deleteRecipe } from "@/app/actions/recipes";

export function DeleteRecipeButton({ id, name }: { id: number; name: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(() => {
      const fd = new FormData();
      fd.set("id", String(id));
      deleteRecipe(fd);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
