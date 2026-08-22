import { CuisinePairing } from "./cuisine";

export type { CuisinePairing };

// Ingredient supports both old (quantity string) and new (amount + unit) formats
export type Ingredient = {
  name: string;
  // New structured format
  amount?: string;
  unit?: string;
  // Legacy format — kept for backward compat with recipes saved before the unit dropdown
  quantity?: string;
};

export type Difficulty = "easy" | "medium" | "hard";

export type ParsedRecipe = {
  id: number;
  name: string;
  mainProtein: string | null;
  mainStarch: string | null;
  mainVegetable: string | null;
  ingredients: Ingredient[];
  favorite: boolean;
  dishCategory: string | null;
  difficulty: Difficulty;
  prepTime: number;
  mealType: string[];
  // Array of up to 2 cuisine pairings (region + style)
  cuisine: CuisinePairing[];
  flavorNotes: string[];
  season: string[];
  cookingMethod: string[];
  createdAt: Date;
  updatedAt: Date;
};

type RawRecipe = Omit<
  ParsedRecipe,
  "ingredients" | "mealType" | "cuisine" | "flavorNotes" | "season" | "cookingMethod"
> & {
  ingredients: string;
  mealType: string;
  cuisine: string;   // stored as JSON: [{region, style}]
  flavorNotes: string;
  season: string;
  cookingMethod: string;
};

const csv = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// Parses the cuisine field — handles JSON (new format) and comma-sep strings (legacy).
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
  // Legacy: comma-separated region or country names, wrap each as a pairing
  return csv(raw).map((v) => ({ region: v, style: v }));
}

export function parseRecipe(raw: RawRecipe): ParsedRecipe {
  return {
    ...raw,
    ingredients: JSON.parse(raw.ingredients) as Ingredient[],
    mealType: csv(raw.mealType),
    cuisine: parseCuisine(raw.cuisine),
    flavorNotes: csv(raw.flavorNotes),
    season: csv(raw.season),
    cookingMethod: csv(raw.cookingMethod),
  };
}

/** Returns the displayable quantity string for an ingredient, handling both formats. */
export function ingredientQty(ing: Ingredient): string {
  if (ing.quantity) return ing.quantity;
  return [ing.amount, ing.unit].filter(Boolean).join(" ");
}

export const difficultyStyle: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-green-100 text-green-800" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-800" },
  hard: { label: "Hard", className: "bg-red-100 text-red-800" },
};
