import { CuisinePairing } from "./cuisine";

export type { CuisinePairing };

// Ingredient supports both old (quantity string) and new (amount + unit) formats
export type Ingredient = {
  name: string;
  amount?: string;
  unit?: string;
  // Legacy format kept for backward compat
  quantity?: string;
};

export type Difficulty = "easy" | "medium" | "hard";
export type Rating = "up" | "down" | null;

export type ParsedRecipe = {
  id: number;
  name: string;
  mainProtein: string | null;
  mainStarch: string | null;
  mainVegetable: string | null;
  ingredients: Ingredient[];
  directions: string[];
  favorite: boolean;
  dishCategory: string | null;
  difficulty: Difficulty;
  prepTime: number;
  mealType: string[];
  cuisine: CuisinePairing[];
  flavorNotes: string[];
  season: string[];
  cookingMethod: string[];
  rating: Rating;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RawRecipe = Omit<
  ParsedRecipe,
  | "ingredients"
  | "directions"
  | "mealType"
  | "cuisine"
  | "flavorNotes"
  | "season"
  | "cookingMethod"
  | "rating"
> & {
  ingredients: string;
  directions: string;
  mealType: string;
  cuisine: string;
  flavorNotes: string;
  season: string;
  cookingMethod: string;
  rating: string | null;
};

const csv = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

function parseCuisine(raw: string): CuisinePairing[] {
  if (!raw || raw === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return (parsed as CuisinePairing[]).filter((p) => p && p.region && p.style);
    }
  } catch {
    // fall through to legacy parsing
  }
  return csv(raw).map((v) => ({ region: v, style: v }));
}

function parseDirections(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function parseRecipe(raw: RawRecipe): ParsedRecipe {
  return {
    ...raw,
    ingredients: JSON.parse(raw.ingredients) as Ingredient[],
    directions: parseDirections(raw.directions),
    mealType: csv(raw.mealType),
    cuisine: parseCuisine(raw.cuisine),
    flavorNotes: csv(raw.flavorNotes),
    season: csv(raw.season),
    cookingMethod: csv(raw.cookingMethod),
    rating: raw.rating === "up" || raw.rating === "down" ? raw.rating : null,
  };
}

/** Returns the displayable quantity string for an ingredient, handling both formats. */
export function ingredientQty(ing: Ingredient): string {
  if (ing.quantity) return ing.quantity;
  return [ing.amount, ing.unit].filter(Boolean).join(" ");
}

export const difficultyStyle: Record<Difficulty, { label: string; className: string }> = {
  easy:   { label: "Easy",   className: "bg-green-100 text-green-800" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-800" },
  hard:   { label: "Hard",   className: "bg-red-100 text-red-800" },
};

export const ratingIcon: Record<NonNullable<Rating>, string> = {
  up:   "👍",
  down: "👎",
};
