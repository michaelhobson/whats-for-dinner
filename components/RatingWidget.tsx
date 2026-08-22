"use client";

import { useTransition } from "react";
import { updateRating } from "@/app/actions/recipes";
import { Rating } from "@/lib/recipe-utils";

export function RatingWidget({ recipeId, rating }: { recipeId: number; rating: Rating }) {
  const [isPending, startTransition] = useTransition();

  const setRating = (newRating: Rating) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", String(recipeId));
      if (newRating) fd.set("rating", newRating);
      await updateRating(fd);
    });
  };

  const btn = (value: Rating, icon: string, label: string) => {
    const active = rating === value;
    return (
      <button
        type="button"
        onClick={() => setRating(active ? null : value)}
        disabled={isPending}
        title={active ? `Clear rating` : label}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
          active
            ? "bg-orange-100 border border-orange-300 text-orange-800 shadow-sm"
            : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
        }`}
      >
        {icon}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-1">Rate</span>
      {btn("up",   "👍", "Liked it")}
      {btn("down", "👎", "Not a hit")}
    </div>
  );
}
