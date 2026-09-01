/**
 * Shared filter types, constants, and pure functions used by both the
 * Randomizer and the Cookbook filter panel. Change filter logic here and
 * it applies everywhere automatically.
 */

import { CUISINE_REGIONS, CuisinePairing } from "./cuisine";
import { DISH_CATEGORIES } from "./dish-categories";
import { ParsedRecipe } from "./recipe-utils";

// ── Option constants ──────────────────────────────────────────────────────────

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "dessert", "snack"] as const;

export const FLAVOR_NOTES = [
  "rich", "sweet", "bright", "cheesy", "creamy", "spicy",
  "umami", "tangy", "smoky", "herby", "nutty", "garlicky",
] as const;

export const SEASONS = ["spring", "summer", "fall", "winter", "any"] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const RATING_OPTIONS = [
  { value: "up",   label: "👍 Liked" },
  { value: "none", label: "⬜ Not yet rated" },
  { value: "down", label: "👎 Not a hit" },
] as const;

// Default: thumbs-up and unrated included; thumbs-down excluded
export const RATING_DEFAULT = ["up", "none"];

export const COOKING_METHODS = [
  { value: "oven",        label: "Oven" },
  { value: "stovetop",    label: "Stovetop" },
  { value: "instant-pot", label: "Instant Pot" },
  { value: "slow-cooker", label: "Slow Cooker" },
  { value: "grill",       label: "Grill" },
  { value: "no-cook",     label: "No Cook" },
  { value: "air-fryer",   label: "Air Fryer" },
] as const;

// Flattened list of every cuisine style across all regions
export const ALL_CUISINE_STYLES = CUISINE_REGIONS.flatMap((r) => r.styles);

// ── Filters type ──────────────────────────────────────────────────────────────

export type Filters = {
  mealType: string[];
  cuisine: string[];      // selected style strings; empty = no constraint = match all
  dishCategory: string[];
  flavorNotes: string[];
  season: string[];
  difficulty: string[];
  cookingMethod: string[];
  // Rating uses exact-match logic: empty = no recipes match (intentional, unlike other filters)
  rating: string[];
  protein: string;
  starch: string;
  vegetable: string;
};

// ── Default filter state ──────────────────────────────────────────────────────

// Rating intentionally defaults to a partial selection (up + none) per product spec.
export function computeDefaultFilters(): Filters {
  return {
    mealType:      [...MEAL_TYPES],
    cuisine:       [...ALL_CUISINE_STYLES],
    dishCategory:  [...DISH_CATEGORIES],
    flavorNotes:   [...FLAVOR_NOTES],
    season:        [...SEASONS],
    difficulty:    [...DIFFICULTIES],
    cookingMethod: COOKING_METHODS.map((m) => m.value),
    rating:        [...RATING_DEFAULT],
    protein:       "",
    starch:        "",
    vegetable:     "",
  };
}

// ── Apply filters ─────────────────────────────────────────────────────────────

export function applyFilters(recipes: ParsedRecipe[], f: Filters): ParsedRecipe[] {
  // A filter is unconstrained when it's empty OR every possible option is selected.
  // In both cases all recipes pass, including those with no value in that category.
  // When a strict subset is selected, only recipes whose value overlaps pass;
  // recipes with no value (null/empty) are excluded.
  const unconstrained = (filter: string[], totalOptions: number) =>
    filter.length === 0 || filter.length >= totalOptions;

  const matchArr = (vals: string[], filter: string[], totalOptions: number) =>
    unconstrained(filter, totalOptions) || filter.some((v) => vals.includes(v));

  const matchSeason = (vals: string[], filter: string[]) => {
    if (unconstrained(filter, SEASONS.length)) return true;
    return vals.includes("any") || filter.some((v) => vals.includes(v));
  };

  const matchCuisine = (cuisines: CuisinePairing[], filter: string[]) => {
    if (unconstrained(filter, ALL_CUISINE_STYLES.length)) return true;
    return cuisines.some((p) => filter.includes(p.style));
  };

  const matchDishCategory = (category: string | null, filter: string[]) => {
    if (unconstrained(filter, DISH_CATEGORIES.length)) return true;
    return category != null && filter.includes(category);
  };

  const matchText = (val: string | null, q: string) =>
    !q.trim() || (val?.toLowerCase().includes(q.toLowerCase()) ?? false);

  // Rating uses exact-match only; empty filter means no recipes pass (intentional).
  const matchRating = (rating: string | null, filter: string[]) =>
    filter.includes(rating ?? "none");

  return recipes.filter(
    (r) =>
      matchArr(r.mealType, f.mealType, MEAL_TYPES.length) &&
      matchCuisine(r.cuisine, f.cuisine) &&
      matchDishCategory(r.dishCategory, f.dishCategory) &&
      matchArr(r.flavorNotes, f.flavorNotes, FLAVOR_NOTES.length) &&
      matchSeason(r.season, f.season) &&
      matchArr([r.difficulty], f.difficulty, DIFFICULTIES.length) &&
      matchArr(r.cookingMethod, f.cookingMethod, COOKING_METHODS.length) &&
      matchRating(r.rating, f.rating) &&
      matchText(r.mainProtein, f.protein) &&
      matchText(r.mainStarch, f.starch) &&
      matchText(r.mainVegetable, f.vegetable)
  );
}

// ── Per-option recipe counts ──────────────────────────────────────────────────

export type FilterCounts = {
  mealType: Map<string, number>;
  cuisine: Map<string, number>;
  dishCategory: Map<string, number>;
  flavorNotes: Map<string, number>;
  season: Map<string, number>;
  difficulty: Map<string, number>;
  cookingMethod: Map<string, number>;
  rating: Map<string, number>;
};

export function computeCounts(recipes: ParsedRecipe[]): FilterCounts {
  const mealType      = new Map<string, number>();
  const cuisine       = new Map<string, number>();
  const dishCategory  = new Map<string, number>();
  const flavorNotes   = new Map<string, number>();
  const season        = new Map<string, number>();
  const difficulty    = new Map<string, number>();
  const cookingMethod = new Map<string, number>();
  const rating        = new Map<string, number>();

  for (const r of recipes) {
    r.mealType.forEach((v) => mealType.set(v, (mealType.get(v) ?? 0) + 1));
    r.cuisine.forEach((p) => cuisine.set(p.style, (cuisine.get(p.style) ?? 0) + 1));
    if (r.dishCategory) dishCategory.set(r.dishCategory, (dishCategory.get(r.dishCategory) ?? 0) + 1);
    r.flavorNotes.forEach((v) => flavorNotes.set(v, (flavorNotes.get(v) ?? 0) + 1));
    r.season.forEach((v) => season.set(v, (season.get(v) ?? 0) + 1));
    if (r.difficulty) difficulty.set(r.difficulty, (difficulty.get(r.difficulty) ?? 0) + 1);
    r.cookingMethod.forEach((v) => cookingMethod.set(v, (cookingMethod.get(v) ?? 0) + 1));
    const rv = r.rating ?? "none";
    rating.set(rv, (rating.get(rv) ?? 0) + 1);
  }

  return { mealType, cuisine, dishCategory, flavorNotes, season, difficulty, cookingMethod, rating };
}

// ── Narrowed category count ───────────────────────────────────────────────────

// Returns the number of filter categories that are narrower than their default
// (i.e., actively filtering something out). Useful for showing a badge on the
// filter toggle. Does NOT include the name/ingredient text search — add that
// separately in the calling component if needed.
export function computeNarrowedCount(filters: Filters): number {
  let n = 0;
  if (filters.mealType.length > 0 && filters.mealType.length < MEAL_TYPES.length) n++;
  if (filters.flavorNotes.length > 0 && filters.flavorNotes.length < FLAVOR_NOTES.length) n++;
  if (filters.season.length > 0 && filters.season.length < SEASONS.length) n++;
  if (filters.difficulty.length > 0 && filters.difficulty.length < DIFFICULTIES.length) n++;
  if (filters.cookingMethod.length > 0 && filters.cookingMethod.length < COOKING_METHODS.length) n++;
  if (filters.cuisine.length > 0 && filters.cuisine.length < ALL_CUISINE_STYLES.length) n++;
  if (filters.dishCategory.length > 0 && filters.dishCategory.length < DISH_CATEGORIES.length) n++;
  // Rating is narrowed whenever it's not all 3 options (default is already partial)
  if (filters.rating.length < RATING_OPTIONS.length) n++;
  if (filters.protein.trim()) n++;
  if (filters.starch.trim()) n++;
  if (filters.vegetable.trim()) n++;
  return n;
}
