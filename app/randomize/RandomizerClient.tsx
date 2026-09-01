"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ParsedRecipe, difficultyStyle } from "@/lib/recipe-utils";
import { CuisinePairing } from "@/lib/cuisine";
import RecipeCard from "@/components/RecipeCard";
import { FilterPanel } from "@/components/FilterPanel";
import {
  Filters,
  computeDefaultFilters,
  applyFilters,
  computeNarrowedCount,
} from "@/lib/recipe-filters";

// ── Spin timing ───────────────────────────────────────────────────────────────

const SPIN_FRAMES_MS = [60, 65, 70, 75, 85, 100, 120, 145, 175, 215, 265, 325, 400, 300];
const LOCK_GROUPS = ["name", "components", "tags", "stats"] as const;
type LockGroup = (typeof LOCK_GROUPS)[number];
const LOCK_INTERVAL_MS = 220;
const REVEAL_DELAY_MS  = 350;

// ── Component ─────────────────────────────────────────────────────────────────

export default function RandomizerClient({ recipes }: { recipes: ParsedRecipe[] }) {
  const [filters, setFilters] = useState<Filters>(() => computeDefaultFilters());
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [drawn, setDrawn] = useState<ParsedRecipe[]>([]);
  const [rollKey, setRollKey] = useState(0);

  // Animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [lockedGroups, setLockedGroups] = useState<Set<LockGroup>>(new Set());
  const [animating, setAnimating] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredPool = useMemo(() => applyFilters(recipes, filters), [recipes, filters]);

  const narrowedCount = useMemo(() => computeNarrowedCount(filters), [filters]);

  // Fields pinned (single-value filter) — used by SpinnerCard to suppress cycling
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

  // Grid layout tracks `count`, not drawn.length, so slots appear immediately
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
                onClick={() => setFilters(computeDefaultFilters())}
                className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
              >
                Reset filters
              </button>
            </div>

            {filtersOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <FilterPanel
                  recipes={recipes}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
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

      {/* Cards area */}
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

// ── Pure helpers ──────────────────────────────────────────────────────────────

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

const FIELD_KEYS = ["mealType", "name", "components", "cuisine", "flavorNotes", "prepTime", "difficulty"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

type FieldState = { display: ParsedRecipe; frame: number };

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
