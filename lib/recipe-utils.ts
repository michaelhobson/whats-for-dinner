export type Ingredient = { name: string; quantity?: string };
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
  cuisine: string[];
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
  cuisine: string;
  flavorNotes: string;
  season: string;
  cookingMethod: string;
};

const csv = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function parseRecipe(raw: RawRecipe): ParsedRecipe {
  return {
    ...raw,
    ingredients: JSON.parse(raw.ingredients) as Ingredient[],
    mealType: csv(raw.mealType),
    cuisine: csv(raw.cuisine),
    flavorNotes: csv(raw.flavorNotes),
    season: csv(raw.season),
    cookingMethod: csv(raw.cookingMethod),
  };
}

export const difficultyStyle: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-green-100 text-green-800" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-800" },
  hard: { label: "Hard", className: "bg-red-100 text-red-800" },
};
