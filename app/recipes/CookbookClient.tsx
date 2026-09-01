"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ParsedRecipe } from "@/lib/recipe-utils";
import RecipeCard from "@/components/RecipeCard";
import { FilterPanel } from "@/components/FilterPanel";
import {
  Filters,
  computeDefaultFilters,
  applyFilters,
  computeNarrowedCount,
} from "@/lib/recipe-filters";

export default function CookbookClient({ recipes }: { recipes: ParsedRecipe[] }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(() => computeDefaultFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const afterFilters = applyFilters(recipes, filters);
    if (!q) return afterFilters;
    return afterFilters.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
    );
  }, [recipes, filters, search]);

  const narrowedCount = useMemo(() => {
    let n = computeNarrowedCount(filters);
    if (search.trim()) n++;
    return n;
  }, [filters, search]);

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
        <span className="text-6xl mb-4">🍳</span>
        <p className="text-xl font-medium text-gray-500 mb-1">No recipes yet</p>
        <p className="text-sm mb-6">Add your first one to get started.</p>
        <Link
          href="/recipes/new"
          className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
        >
          Add a Recipe
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search + filter bar */}
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 space-y-3">
        {/* Search input */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes or ingredients…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
        />

        {/* Filter toggle row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span className={`text-[10px] transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`}>▶</span>
            Filters
            {narrowedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                {narrowedCount} active
              </span>
            )}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {filtered.length === recipes.length ? (
                <><span className="font-semibold text-gray-800">{recipes.length}</span> {recipes.length === 1 ? "recipe" : "recipes"}</>
              ) : filtered.length === 0 ? (
                <span className="text-red-500 font-medium">No recipes match</span>
              ) : (
                <><span className="font-semibold text-gray-800">{filtered.length}</span> of {recipes.length}</>
              )}
            </span>
            {narrowedCount > 0 && (
              <button
                onClick={() => { setFilters(computeDefaultFilters()); setSearch(""); }}
                className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter panel (collapsed by default) */}
        {filtersOpen && (
          <div className="pt-2 border-t border-gray-100">
            <FilterPanel
              recipes={recipes}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        )}
      </div>

      {/* Recipe grid or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
          <span className="text-5xl mb-3">🔍</span>
          <p className="text-lg font-medium text-gray-500 mb-1">No recipes match</p>
          <p className="text-sm mb-4">Try adjusting your search or filters.</p>
          <button
            onClick={() => { setFilters(computeDefaultFilters()); setSearch(""); }}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
