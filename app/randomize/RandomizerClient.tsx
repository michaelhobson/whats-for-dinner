"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ParsedRecipe } from "@/lib/recipe-utils";
import RecipeCard from "@/components/RecipeCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Filters = {
  mealType: string[];
  cuisine: string[];
  dishCategory: string[];
  flavorNotes: string[];
  season: string[];
  difficulty: string[];
  cookingMethod: string[];
  protein: string;
  starch: string;
  vegetable: string;
};

const EMPTY_FILTERS: Filters = {
  mealType: [],
  cuisine: [],
  dishCategory: [],
  flavorNotes: [],
  season: [],
  difficulty: [],
  cookingMethod: [],
  protein: "",
  starch: "",
  vegetable: "",
};

// ── Filtering logic ───────────────────────────────────────────────────────────

function applyFilters(recipes: ParsedRecipe[], f: Filters): ParsedRecipe[] {
  const matchArr = (vals: string[], filter: string[]) =>
    filter.length === 0 || filter.some((v) => vals.includes(v));

  // Recipes tagged "any" match every season filter
  const matchSeason = (vals: string[], filter: string[]) =>
    filter.length === 0 || vals.includes("any") || filter.some((v) => vals.includes(v));

  const matchText = (val: string | null, q: string) =>
    !q.trim() || (val?.toLowerCase().includes(q.toLowerCase()) ?? false);

  return recipes.filter(
    (r) =>
      matchArr(r.mealType, f.mealType) &&
      matchArr(r.cuisine, f.cuisine) &&
      (f.dishCategory.length === 0 ||
        (r.dishCategory != null && f.dishCategory.includes(r.dishCategory))) &&
      matchArr(r.flavorNotes, f.flavorNotes) &&
      matchSeason(r.season, f.season) &&
      matchArr([r.difficulty], f.difficulty) &&
      matchArr(r.cookingMethod, f.cookingMethod) &&
      matchText(r.mainProtein, f.protein) &&
      matchText(r.mainStarch, f.starch) &&
      matchText(r.mainVegetable, f.vegetable)
  );
}

// Fisher-Yates shuffle, returns up to n unique items
function pickRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RandomizerClient({ recipes }: { recipes: ParsedRecipe[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [drawn, setDrawn] = useState<ParsedRecipe[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Unique values derived from the actual DB contents (grow as recipes are added)
  const uniqueCuisines = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.cuisine))].sort(),
    [recipes]
  );
  const uniqueCategories = useMemo(
    () =>
      [...new Set(recipes.map((r) => r.dishCategory).filter((c): c is string => c != null))].sort(),
    [recipes]
  );

  const filteredPool = useMemo(() => applyFilters(recipes, filters), [recipes, filters]);

  const roll = useCallback(() => {
    setDrawn(pickRandom(filteredPool, count));
  }, [filteredPool, count]);

  // Auto-roll on mount so the user immediately sees a result
  useEffect(() => {
    if (recipes.length > 0) setDrawn(pickRandom(recipes, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFilterCount = useMemo(() => {
    const arr = [
      filters.mealType.length,
      filters.cuisine.length,
      filters.dishCategory.length,
      filters.flavorNotes.length,
      filters.season.length,
      filters.difficulty.length,
      filters.cookingMethod.length,
    ].filter(Boolean).length;
    const txt = [filters.protein, filters.starch, filters.vegetable].filter(
      (s) => s.trim()
    ).length;
    return arr + txt;
  }, [filters]);

  const toggleArr = (key: keyof Omit<Filters, "protein" | "starch" | "vegetable">, val: string) =>
    setFilters((prev) => {
      const cur = prev[key] as string[];
      return { ...prev, [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] };
    });

  const setTxt = (key: "protein" | "starch" | "vegetable", val: string) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="flex-1 bg-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎲 What&apos;s For Dinner?</h1>
          <p className="text-sm text-gray-500">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in your collection
          </p>
        </div>

        {/* Control panel */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6 space-y-5">

          {/* How many */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">How many recipes?</p>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-10 h-10 rounded-xl font-semibold text-sm transition-colors ${
                    count === n
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Filter toggle */}
          <div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <span
                  className={`text-[10px] transition-transform duration-200 ${
                    filtersOpen ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
                Filters
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                    {activeFilterCount} active
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Filter panel */}
            {filtersOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FilterCheckboxes
                    label="Meal Type"
                    options={["breakfast", "lunch", "dinner", "dessert", "snack"]}
                    selected={filters.mealType}
                    onToggle={(v) => toggleArr("mealType", v)}
                  />
                  <FilterCheckboxes
                    label="Cuisine"
                    options={uniqueCuisines}
                    selected={filters.cuisine}
                    onToggle={(v) => toggleArr("cuisine", v)}
                  />
                  <FilterCheckboxes
                    label="Season"
                    options={["spring", "summer", "fall", "winter", "any"]}
                    selected={filters.season}
                    onToggle={(v) => toggleArr("season", v)}
                  />
                  <FilterCheckboxes
                    label="Difficulty"
                    options={["easy", "medium", "hard"]}
                    selected={filters.difficulty}
                    onToggle={(v) => toggleArr("difficulty", v)}
                  />
                  <FilterCheckboxes
                    label="Cooking Method"
                    options={["oven", "stovetop", "instant-pot", "slow-cooker", "grill", "no-cook", "air-fryer"]}
                    labels={["Oven", "Stovetop", "Instant Pot", "Slow Cooker", "Grill", "No Cook", "Air Fryer"]}
                    selected={filters.cookingMethod}
                    onToggle={(v) => toggleArr("cookingMethod", v)}
                  />
                  <FilterCheckboxes
                    label="Flavor Notes"
                    options={["rich", "sweet", "bright", "cheesy", "creamy", "spicy", "umami", "tangy"]}
                    selected={filters.flavorNotes}
                    onToggle={(v) => toggleArr("flavorNotes", v)}
                  />
                </div>

                {uniqueCategories.length > 0 && (
                  <FilterCheckboxes
                    label="Dish Category"
                    options={uniqueCategories}
                    selected={filters.dishCategory}
                    onToggle={(v) => toggleArr("dishCategory", v)}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <TextFilter label="Protein contains" value={filters.protein} onChange={(v) => setTxt("protein", v)} placeholder="e.g. chicken" />
                  <TextFilter label="Starch contains"  value={filters.starch}  onChange={(v) => setTxt("starch",  v)} placeholder="e.g. pasta"   />
                  <TextFilter label="Veg contains"     value={filters.vegetable} onChange={(v) => setTxt("vegetable", v)} placeholder="e.g. spinach" />
                </div>
              </div>
            )}
          </div>

          {/* Roll row */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={roll}
              disabled={filteredPool.length === 0}
              className="rounded-xl bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎲 Roll!
            </button>
            <p className="text-sm text-gray-500">
              {filteredPool.length === 0 ? (
                <span className="text-red-500 font-medium">No recipes match</span>
              ) : (
                <>
                  <span className="font-semibold text-gray-800">{filteredPool.length}</span>{" "}
                  {filteredPool.length === 1 ? "recipe" : "recipes"} in the pool
                </>
              )}
            </p>
          </div>
        </div>

        {/* Results */}
        {drawn.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3 px-1">
              {drawn.length === 1 ? "Tonight's pick" : `Tonight's picks`}
            </p>
            <div
              className={`grid gap-4 ${
                drawn.length >= 2 ? "sm:grid-cols-2" : ""
              }`}
            >
              {drawn.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterCheckboxes({
  label,
  options,
  labels,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  labels?: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((val, i) => (
          <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input
              type="checkbox"
              checked={selected.includes(val)}
              onChange={() => onToggle(val)}
              className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
            />
            <span className="capitalize">{labels?.[i] ?? val}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TextFilter({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
      />
    </div>
  );
}
