/** Fixed list of dish category values used across the recipe form and filter panel. */
export const DISH_CATEGORIES = [
  "Casserole / Bake",
  "Curry",
  "Dumplings",
  "Fritters",
  "Noodles",
  "Pasta",
  "Pizza",
  "Rice Bowl / Grain Bowl",
  "Roast",
  "Salad",
  "Sandwich / Wrap",
  "Skewers / Kebabs",
  "Soup",
  "Steak / Chops",
  "Stew / Chili",
  "Stir-Fry",
  "Tacos / Burritos",
  "Something Else",
] as const;

export type DishCategory = (typeof DISH_CATEGORIES)[number];

/** Maps an arbitrary free-text value to the nearest fixed category.
 *  Exact case-insensitive match wins; anything else → "Something Else". */
export function mapToDishCategory(raw: string): DishCategory {
  const normalized = raw.trim().toLowerCase();
  const match = DISH_CATEGORIES.find((c) => c.toLowerCase() === normalized);
  return match ?? "Something Else";
}
