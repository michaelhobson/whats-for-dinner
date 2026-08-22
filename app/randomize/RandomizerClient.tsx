"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ParsedRecipe, difficultyStyle } from "@/lib/recipe-utils";
import { CUISINE_REGIONS, CuisinePairing, cuisineMatchesFilter } from "@/lib/cuisine";
import RecipeCard from "@/components/RecipeCard";

// ── Option constants (mirrored from the add-recipe form) ──────────────────────

const MEAL_TYPES   = ["breakfast", "lunch", "dinner", "dessert", "snack"] as const;
const FLAVOR_NOTES = ["rich", "sweet", "bright", "cheesy", "creamy", "spicy", "umami", "tangy", "smoky", "herby", "nutty", "garlicky"] as const;
const SEASONS      = ["spring", "summer", "fall", "winter", "any"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const COOKING_METHODS = [
  { value: "oven",        label: "Oven" },
  { value: "stovetop",    label: "Stovetop" },
  { value: "instant-pot", label: "Instant Pot" },
  { value: "slow-cooker", label: "Slow Cooker" },
  { value: "grill",       label: "Grill" },
  { value: "no-cook",     label: "No Cook" },
  { value: "air-fryer",   label: "Air Fryer" },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type Filters = {
  mealType: string[];
  cuisine: string[];      // selected style strings; empty = no constraint = match all
  dishCategory: string[];
  flavorNotes: string[];
  season: string[];
  difficulty: string[];
  cookingMethod: string[];
  protein: string;
  starch: string;
  vegetable: string;
};

// Spin timing
const SPIN_FRAMES_MS = [60, 65, 70, 75, 85, 100, 120, 145, 175, 215, 265, 325, 400, 300];
const LOCK_GROUPS = ["name", "components", "tags", "stats"] as const;
type LockGroup = (typeof LOCK_GROUPS)[number];
const LOCK_INTERVAL_MS = 220;
const REVEAL_DELAY_MS  = 350;

// ── Filter initialisation ────────────────────────────────────────────────────

// Builds the default all-selected filter state from the recipe pool.
function computeDefaultFilters(recipes: ParsedRecipe[]): Filters {
  const cuisineStyles = [...new Set(recipes.flatMap((r) => r.cuisine.map((p) => p.style)))].sort();
  const categories    = [...new Set(recipes.map((r) => r.dishCategory).filter((c): c is string => c != null))].sort();
  return {
    mealType:     [...MEAL_TYPES],
    cuisine:      cuisineStyles,
    dishCategory: categories,
    flavorNotes:  [...FLAVOR_NOTES],
    season:       [...SEASONS],
    difficulty:   [...DIFFICULTIES],
    cookingMethod: COOKING_METHODS.map((m) => m.value),
    protein:      "",
    starch:       "",
    vegetable:    "",
  };
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function applyFilters(recipes: ParsedRecipe[], f: Filters): ParsedRecipe[] {
  const matchArr = (vals: string[], filter: string[]) =>
    filter.length === 0 || filter.some((v) => vals.includes(v));

  const matchSeason = (vals: string[], filter: string[]) =>
    filter.length === 0 || vals.includes("any") || filter.some((v) => vals.includes(v));

  const matchText = (val: string | null, q: string) =>
    !q.trim() || (val?.toLowerCase().includes(q.toLowerCase()) ?? false);

  return recipes.filter(
    (r) =>
      matchArr(r.mealType, f.mealType) &&
      cuisineMatchesFilter(r.cuisine, f.cuisine) &&
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

function pickRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function randomFrom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RandomizerClient({ recipes }: { recipes: ParsedRecipe[] }) {
  const [filters, setFilters] = useState<Filters>(() => computeDefaultFilters(recipes));
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Which regions are expanded in the cuisine accordion (multiple can be open)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  const [drawn, setDrawn] = useState<ParsedRecipe[]>([]);
  const [rollKey, setRollKey] = useState(0);

  // Animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [lockedGroups, setLockedGroups] = useState<Set<LockGroup>>(new Set());
  const [animating, setAnimating] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Derived data ───────────────────────────────────────────────────────────

  // Index of regions → styles that exist in the recipe collection
  const cuisineIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    recipes.forEach((r) => {
      r.cuisine.forEach((p) => {
        if (!map.has(p.region)) map.set(p.region, new Set());
        map.get(p.region)!.add(p.style);
      });
    });
    return map;
  }, [recipes]);

  const uniqueCategories = useMemo(
    () =>
      [...new Set(recipes.map((r) => r.dishCategory).filter((c): c is string => c != null))].sort(),
    [recipes]
  );

  const filteredPool = useMemo(() => applyFilters(recipes, filters), [recipes, filters]);

  // Count narrowed categories: has some (not all, not none) selected
  const narrowedCount = useMemo(() => {
    let n = 0;
    if (filters.mealType.length > 0 && filters.mealType.length < MEAL_TYPES.length) n++;
    if (filters.flavorNotes.length > 0 && filters.flavorNotes.length < FLAVOR_NOTES.length) n++;
    if (filters.season.length > 0 && filters.season.length < SEASONS.length) n++;
    if (filters.difficulty.length > 0 && filters.difficulty.length < DIFFICULTIES.length) n++;
    if (filters.cookingMethod.length > 0 && filters.cookingMethod.length < COOKING_METHODS.length) n++;
    const totalStyles = [...cuisineIndex.values()].reduce((acc, s) => acc + s.size, 0);
    if (filters.cuisine.length > 0 && filters.cuisine.length < totalStyles) n++;
    if (filters.dishCategory.length > 0 && uniqueCategories.length > 0 && filters.dishCategory.length < uniqueCategories.length) n++;
    if (filters.protein.trim()) n++;
    if (filters.starch.trim()) n++;
    if (filters.vegetable.trim()) n++;
    return n;
  }, [filters, cuisineIndex, uniqueCategories]);

  // Fields pinned (single-value filter) — used by SpinnerCard
  const fixedFields = useMemo((): Set<string> => {
    const s = new Set<string>();
    if (filters.mealType.length === 1) s.add("mealType");
    if (filters.cuisine.length === 1) s.add("cuisine");
    if (filters.flavorNotes.length === 1) s.add("flavorNotes");
    if (filters.difficulty.length === 1) s.add("difficulty");
    if (filters.season.length === 1) s.add("season");
    if (filters.cookingMethod.length === 1) s.add("cookingMethod");
    return s;
  }, [filters]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // ── Roll ───────────────────────────────────────────────────────────────────

  const roll = useCallback(() => {
    if (animating || filteredPool.length === 0) return;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    const finalPicks = pickRandom(filteredPool, count);
    const nextRollKey = rollKey + 1;

    setDrawn(finalPicks);
    setRollKey(nextRollKey);
    setIsSpinning(true);
    setAnimating(true);
    setLockedGroups(new Set());

    // All cards start simultaneously; field-level stagger is handled inside SpinnerCard.
    const spinElapsed = SPIN_FRAMES_MS.reduce((a, b) => a + b, 0);

    LOCK_GROUPS.forEach((group, i) => {
      const t = setTimeout(
        () => setLockedGroups((prev) => new Set([...prev, group])),
        spinElapsed + i * LOCK_INTERVAL_MS
      );
      timers.current.push(t);
    });

    const revealAt = spinElapsed + LOCK_GROUPS.length * LOCK_INTERVAL_MS + REVEAL_DELAY_MS;
    timers.current.push(
      setTimeout(() => {
        setIsSpinning(false);
        setAnimating(false);
      }, revealAt)
    );
  }, [animating, filteredPool, count, rollKey]);

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const resetFilters = () => {
    setFilters(computeDefaultFilters(recipes));
    setExpandedRegions(new Set());
  };

  const setArr = (key: keyof Omit<Filters, "protein" | "starch" | "vegetable">, val: string[]) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  const toggleItem = (key: keyof Omit<Filters, "protein" | "starch" | "vegetable">, val: string) =>
    setFilters((prev) => {
      const cur = prev[key] as string[];
      return { ...prev, [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] };
    });

  const setTxt = (key: "protein" | "starch" | "vegetable", val: string) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  // Cuisine accordion helpers
  const isRegionAllSelected = (region: string) => {
    const styles = [...(cuisineIndex.get(region) ?? [])];
    return styles.length > 0 && styles.every((s) => filters.cuisine.includes(s));
  };
  const isRegionAnySelected = (region: string) => {
    const styles = [...(cuisineIndex.get(region) ?? [])];
    return styles.some((s) => filters.cuisine.includes(s));
  };
  const toggleRegionCuisine = (region: string) => {
    const styles = [...(cuisineIndex.get(region) ?? [])];
    const allSelected = styles.every((s) => filters.cuisine.includes(s));
    setFilters((prev) => ({
      ...prev,
      cuisine: allSelected
        ? prev.cuisine.filter((s) => !styles.includes(s))
        : [...new Set([...prev.cuisine, ...styles])],
    }));
  };
  const toggleStyleCuisine = (style: string) =>
    setFilters((prev) => ({
      ...prev,
      cuisine: prev.cuisine.includes(style)
        ? prev.cuisine.filter((s) => s !== style)
        : [...prev.cuisine, style],
    }));

  const toggleRegionExpanded = (region: string) =>
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });

  // Grid layout tracks `count`, not drawn.length, so slots appear immediately
  // when the user picks a number — before clicking roll.
  const cardsWidthCls = count === 3 ? "max-w-5xl" : "max-w-3xl";
  const cardsGridCls =
    count === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : count === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 bg-orange-50">
      {/* Control panel */}
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎲 What&apos;s For Dinner?</h1>
          <p className="text-sm text-gray-500">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"} in your collection
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 space-y-5">
          {/* Count */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">How many recipes?</p>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  disabled={animating}
                  className={`w-10 h-10 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
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

          {/* Filters collapsible */}
          <div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <span className={`text-[10px] transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`}>▶</span>
                Filters
                {narrowedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                    {narrowedCount} narrowed
                  </span>
                )}
              </button>
              <button
                onClick={resetFilters}
                className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
              >
                Reset filters
              </button>
            </div>

            {filtersOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-6">

                {/* Meal Type */}
                <CategoryFilter
                  label="Meal Type"
                  allOptions={[...MEAL_TYPES]}
                  selected={filters.mealType}
                  onSelectAll={() => setArr("mealType", [...MEAL_TYPES])}
                  onClear={() => setArr("mealType", [])}
                >
                  <CheckboxList
                    options={[...MEAL_TYPES]}
                    selected={filters.mealType}
                    onToggle={(v) => toggleItem("mealType", v)}
                  />
                </CategoryFilter>

                {/* Cuisine accordion */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cuisine</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const all = [...cuisineIndex.values()].flatMap((s) => [...s]);
                          setArr("cuisine", all);
                        }}
                        className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setArr("cuisine", [])}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {cuisineIndex.size === 0 ? (
                    <p className="text-sm text-gray-400 italic">No recipes with cuisine tags yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {CUISINE_REGIONS.filter((r) => cuisineIndex.has(r.region)).map(({ region }) => {
                        const styles = [...(cuisineIndex.get(region) ?? [])].sort();
                        const allSel = isRegionAllSelected(region);
                        const anySel = isRegionAnySelected(region);
                        const selCount = styles.filter((s) => filters.cuisine.includes(s)).length;
                        const isExpanded = expandedRegions.has(region);

                        return (
                          <div key={region} className="rounded-lg border border-gray-100 overflow-hidden">
                            {/* Region header */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/60">
                              <IndeterminateCheckbox
                                checked={allSel}
                                indeterminate={anySel && !allSel}
                                onChange={() => toggleRegionCuisine(region)}
                              />
                              <button
                                type="button"
                                onClick={() => toggleRegionExpanded(region)}
                                className="flex-1 flex items-center justify-between text-left"
                              >
                                <span className="text-sm font-medium text-gray-700">{region}</span>
                                <div className="flex items-center gap-2">
                                  {anySel && !allSel && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                      {selCount}
                                    </span>
                                  )}
                                  <span className={`text-[10px] text-gray-400 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}>
                                    ▶
                                  </span>
                                </div>
                              </button>
                            </div>
                            {/* Style checkboxes */}
                            {isExpanded && (
                              <div className="px-4 pt-2 pb-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-2">
                                {styles.map((style) => (
                                  <label
                                    key={style}
                                    className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={filters.cuisine.includes(style)}
                                      onChange={() => toggleStyleCuisine(style)}
                                      className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
                                    />
                                    {style}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Season */}
                <CategoryFilter
                  label="Season"
                  allOptions={[...SEASONS]}
                  selected={filters.season}
                  onSelectAll={() => setArr("season", [...SEASONS])}
                  onClear={() => setArr("season", [])}
                >
                  <CheckboxList
                    options={[...SEASONS]}
                    selected={filters.season}
                    onToggle={(v) => toggleItem("season", v)}
                  />
                </CategoryFilter>

                {/* Difficulty */}
                <CategoryFilter
                  label="Difficulty"
                  allOptions={[...DIFFICULTIES]}
                  selected={filters.difficulty}
                  onSelectAll={() => setArr("difficulty", [...DIFFICULTIES])}
                  onClear={() => setArr("difficulty", [])}
                >
                  <CheckboxList
                    options={[...DIFFICULTIES]}
                    selected={filters.difficulty}
                    onToggle={(v) => toggleItem("difficulty", v)}
                  />
                </CategoryFilter>

                {/* Cooking Method */}
                <CategoryFilter
                  label="Cooking Method"
                  allOptions={COOKING_METHODS.map((m) => m.value)}
                  selected={filters.cookingMethod}
                  onSelectAll={() => setArr("cookingMethod", COOKING_METHODS.map((m) => m.value))}
                  onClear={() => setArr("cookingMethod", [])}
                >
                  <CheckboxList
                    options={COOKING_METHODS.map((m) => m.value)}
                    labels={COOKING_METHODS.map((m) => m.label)}
                    selected={filters.cookingMethod}
                    onToggle={(v) => toggleItem("cookingMethod", v)}
                  />
                </CategoryFilter>

                {/* Flavor Notes */}
                <CategoryFilter
                  label="Flavor Notes"
                  allOptions={[...FLAVOR_NOTES]}
                  selected={filters.flavorNotes}
                  onSelectAll={() => setArr("flavorNotes", [...FLAVOR_NOTES])}
                  onClear={() => setArr("flavorNotes", [])}
                >
                  <CheckboxList
                    options={[...FLAVOR_NOTES]}
                    selected={filters.flavorNotes}
                    onToggle={(v) => toggleItem("flavorNotes", v)}
                  />
                </CategoryFilter>

                {/* Dish Category */}
                {uniqueCategories.length > 0 && (
                  <CategoryFilter
                    label="Dish Category"
                    allOptions={uniqueCategories}
                    selected={filters.dishCategory}
                    onSelectAll={() => setArr("dishCategory", uniqueCategories)}
                    onClear={() => setArr("dishCategory", [])}
                  >
                    <CheckboxList
                      options={uniqueCategories}
                      selected={filters.dishCategory}
                      onToggle={(v) => toggleItem("dishCategory", v)}
                    />
                  </CategoryFilter>
                )}

                {/* Component text filters */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Ingredient / Component
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <TextFilter label="Protein contains"  value={filters.protein}   onChange={(v) => setTxt("protein", v)}   placeholder="e.g. chicken" />
                    <TextFilter label="Starch contains"   value={filters.starch}    onChange={(v) => setTxt("starch", v)}    placeholder="e.g. pasta" />
                    <TextFilter label="Veg contains"      value={filters.vegetable} onChange={(v) => setTxt("vegetable", v)} placeholder="e.g. spinach" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Roll button */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={roll}
              disabled={animating || filteredPool.length === 0}
              className="rounded-xl bg-orange-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {animating ? "🎰 Deciding…" : "🎲 What's For Dinner?"}
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
      </div>

      {/* Cards area — always shows `count` slots so the layout doesn't jump on roll */}
      <div className={`mx-auto px-4 pb-12 ${cardsWidthCls}`}>
        {isSpinning ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3 px-1">
              Finding your dinner…
            </p>
            <div className={`grid gap-4 ${cardsGridCls}`}>
              {Array.from({ length: count }).map((_, i) => (
                <SpinnerCard
                  key={i}
                  finalRecipe={drawn[i] ?? drawn[0]}
                  filteredPool={filteredPool}
                  fixedFields={fixedFields}
                  lockedGroups={lockedGroups}
                  rollKey={rollKey}
                />
              ))}
            </div>
          </section>
        ) : (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3 px-1">
              {rollKey === 0
                ? "Pick a number and roll"
                : count === 1
                ? "Tonight's pick"
                : "Tonight's picks"}
            </p>
            <div className={`grid gap-4 ${cardsGridCls}`}>
              {Array.from({ length: count }).map((_, i) => {
                const recipe = drawn[i];
                if (!recipe || rollKey === 0) {
                  return <PlaceholderCard key={i} />;
                }
                return (
                  <div
                    key={`${rollKey}-${i}`}
                    style={{ animation: "pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  >
                    <RecipeCard recipe={recipe} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── PlaceholderCard ────────────────────────────────────────────────────────────

function PlaceholderCard() {
  return (
    <article className="bg-white rounded-2xl border-2 border-dashed border-orange-200 p-5 flex flex-col items-center justify-center min-h-[220px] select-none">
      <span className="text-3xl mb-3 opacity-30">🍽️</span>
      <p className="text-sm text-gray-300 font-medium">Ready to roll</p>
    </article>
  );
}

// ── SpinnerCard ────────────────────────────────────────────────────────────────

// The 7 fields shown on a spinner card, each cycling independently.
const FIELD_KEYS = ["mealType", "name", "components", "cuisine", "flavorNotes", "prepTime", "difficulty"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

type FieldState = { display: ParsedRecipe; frame: number };

// Assigns each field a randomly-shuffled slot in a 0–360ms window so they
// feel like independent slot-machine reels rather than perfectly in sync.
function makeFieldDelays(): Record<FieldKey, number> {
  const slots = [0, 60, 120, 180, 240, 300, 360];
  const shuffled = [...slots].sort(() => Math.random() - 0.5);
  return Object.fromEntries(FIELD_KEYS.map((k, i) => [k, shuffled[i]])) as Record<FieldKey, number>;
}

type SpinnerCardProps = {
  finalRecipe: ParsedRecipe;
  filteredPool: ParsedRecipe[];
  fixedFields: Set<string>;
  lockedGroups: Set<LockGroup>;
  rollKey: number;
};

function SpinnerCard({ finalRecipe, filteredPool, fixedFields, lockedGroups, rollKey }: SpinnerCardProps) {
  const initFieldStates = (): Record<FieldKey, FieldState> =>
    Object.fromEntries(FIELD_KEYS.map((k) => [k, { display: randomFrom(filteredPool), frame: 0 }])) as Record<FieldKey, FieldState>;

  const [fieldStates, setFieldStates] = useState<Record<FieldKey, FieldState>>(initFieldStates);
  const cardTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Each field gets its own timer chain, offset by a random delay so they
    // cycle independently — like separate reels in a slot machine.
    const delays = makeFieldDelays();

    FIELD_KEYS.forEach((fieldKey) => {
      let elapsed = delays[fieldKey];
      let f = 0;
      SPIN_FRAMES_MS.forEach((delay) => {
        elapsed += delay;
        f++;
        const fi = f;
        cardTimers.current.push(
          setTimeout(() => {
            setFieldStates((prev) => ({
              ...prev,
              [fieldKey]: { display: randomFrom(filteredPool), frame: fi },
            }));
          }, elapsed)
        );
      });
    });

    return () => { cardTimers.current.forEach(clearTimeout); cardTimers.current = []; };
  // SpinnerCard mounts fresh on each roll (isSpinning gates the render).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slot = (fieldKey: FieldKey, group: LockGroup) => {
    const fixed  = fixedFields.has(fieldKey);
    const locked = lockedGroups.has(group);
    const { display, frame } = fieldStates[fieldKey];
    const recipe = fixed || locked ? finalRecipe : display;
    const key = fixed
      ? `fx-${fieldKey}`
      : locked
      ? `lk-${rollKey}-${fieldKey}`
      : `sp-${frame}-${fieldKey}`;
    const style: React.CSSProperties = fixed ? {} : locked
      ? { animation: "slot-tick 0.25s ease-out both" }
      : { animation: "slot-tick 0.12s ease-out both" };
    return { recipe, key, style };
  };

  const mealType   = slot("mealType",    "tags");
  const name       = slot("name",        "name");
  const components = slot("components",  "components");
  const cuisine    = slot("cuisine",     "tags");
  const flavor     = slot("flavorNotes", "tags");
  const time       = slot("prepTime",    "stats");
  const diff       = slot("difficulty",  "stats");

  const allLocked = LOCK_GROUPS.every((g) => lockedGroups.has(g));

  return (
    <article className={`bg-white rounded-2xl border-2 shadow-md p-5 flex flex-col gap-3 select-none pointer-events-none transition-colors duration-300 ${allLocked ? "border-orange-400" : "border-orange-200"}`}>
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full transition-colors duration-300 ${allLocked ? "bg-orange-500" : "bg-orange-300 animate-pulse"}`} />
        <span className="text-xs text-orange-400 font-semibold uppercase tracking-wide">
          {allLocked ? "Settled" : "Deciding…"}
        </span>
      </div>

      <div key={mealType.key} style={mealType.style} className="flex flex-wrap gap-1 min-h-[1.25rem] overflow-hidden">
        {mealType.recipe.mealType.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize font-medium">{t}</span>
        ))}
      </div>

      <div key={name.key} style={name.style} className="overflow-hidden">
        <h3 className="font-semibold text-gray-900 text-lg leading-snug">{name.recipe.name}</h3>
      </div>

      {(finalRecipe.mainProtein || finalRecipe.mainStarch || finalRecipe.mainVegetable) && (
        <div key={components.key} style={components.style} className="overflow-hidden">
          <p className="text-sm text-gray-500 capitalize">
            {[components.recipe.mainProtein, components.recipe.mainStarch, components.recipe.mainVegetable].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      <div key={cuisine.key} style={cuisine.style} className="flex flex-wrap gap-1 min-h-[1.25rem] overflow-hidden">
        {cuisine.recipe.cuisine.map((p: CuisinePairing, i: number) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{p.style}</span>
        ))}
      </div>

      <div className="flex-1" />

      {(finalRecipe.flavorNotes.length > 0 || fieldStates.flavorNotes.display.flavorNotes.length > 0) && (
        <div key={flavor.key} style={flavor.style} className="flex flex-wrap gap-1 min-h-[1.25rem] overflow-hidden">
          {flavor.recipe.flavorNotes.slice(0, 4).map((note) => (
            <span key={note} className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">{note}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm pt-1 border-t border-gray-50">
        <div key={time.key} style={time.style} className="overflow-hidden">
          <span className="text-gray-500">⏱ {time.recipe.prepTime} min</span>
        </div>
        <div key={diff.key} style={diff.style} className="ml-auto overflow-hidden">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${difficultyStyle[diff.recipe.difficulty].className}`}>
            {difficultyStyle[diff.recipe.difficulty].label}
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Checkbox that can be in an indeterminate state (partial region selection)
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-gray-300 accent-orange-600 cursor-pointer flex-shrink-0"
    />
  );
}

// Wrapper that adds a "Select all / Clear" header row to a filter section
function CategoryFilter({
  label,
  allOptions,
  selected,
  onSelectAll,
  onClear,
  children,
}: {
  label: string;
  allOptions: string[];
  selected: string[];
  onSelectAll: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const isAll   = selected.length === allOptions.length;
  const isEmpty = selected.length === 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="flex gap-3">
          <button
            onClick={onSelectAll}
            disabled={isAll}
            className="text-xs text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-30"
          >
            All
          </button>
          <button
            onClick={onClear}
            disabled={isEmpty}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function CheckboxList({
  options,
  labels,
  selected,
  onToggle,
}: {
  options: string[];
  labels?: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
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
  );
}

function TextFilter({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</label>
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
