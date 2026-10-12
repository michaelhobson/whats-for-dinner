/**
 * Pure layout logic for the shareable recipe card image (fixed 1080×1350
 * canvas). Three discrete density tiers — not continuous scaling — chosen by
 * total content volume. See components/RecipeShareCard.tsx for the visual.
 */

import { Ingredient, ParsedRecipe } from "./recipe-utils";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
// Platforms like Instagram can crop shared images slightly at the edges.
export const SAFE_MARGIN = 64;
export const CONTENT_WIDTH = CARD_WIDTH - 2 * SAFE_MARGIN;

const INGREDIENT_DISPLAY_CAP = 15;
const DIRECTION_LINE_BUDGET = 12;
// Step count folded into the volume score is capped — a handful of very long
// steps shouldn't on their own push a recipe into a denser tier.
const STEP_VOLUME_CAP = 12;

export type CardTier = "generous" | "standard" | "minimal";

export function computeCardTier(recipe: ParsedRecipe): CardTier {
  const volume = recipe.ingredients.length + Math.min(recipe.directions.length, STEP_VOLUME_CAP);
  if (volume <= 10) return "generous";
  if (volume <= 20) return "standard";
  return "minimal";
}

type TierStyle = {
  nameSize: number;
  labelSize: number;
  badgeSize: number;
  ingredientSize: number;
  ingredientLineHeight: number;
  directionSize: number;
  directionLineHeight: number;
  qrSize: number;
  sectionGap: number;
};

// Generous fills space mainly via line-height/gaps, not oversized type — a
// sparse recipe shouldn't look like its text was simply blown up.
export const CARD_TIER_STYLES: Record<CardTier, TierStyle> = {
  generous: {
    nameSize: 72, labelSize: 26, badgeSize: 28,
    ingredientSize: 34, ingredientLineHeight: 1.7,
    directionSize: 34, directionLineHeight: 1.75,
    qrSize: 240, sectionGap: 52,
  },
  standard: {
    nameSize: 64, labelSize: 24, badgeSize: 25,
    ingredientSize: 29, ingredientLineHeight: 1.45,
    directionSize: 29, directionLineHeight: 1.5,
    qrSize: 210, sectionGap: 40,
  },
  minimal: {
    nameSize: 54, labelSize: 21, badgeSize: 22,
    ingredientSize: 24, ingredientLineHeight: 1.3,
    directionSize: 24, directionLineHeight: 1.35,
    qrSize: 180, sectionGap: 28,
  },
};

// Up to `max` values inline, "+N" suffix for the rest. Empty input → "".
export function truncateList(values: string[], max = 2): string {
  if (values.length === 0) return "";
  const shown = values.slice(0, max).join(", ");
  return values.length > max ? `${shown} +${values.length - max}` : shown;
}

export type CardBadge = { label: string; color: "purple" | "blue" | "orange"; text: string };

// Fixed order, colors matching the same Chip mapping used on the recipe
// detail page (RecipeDetailView) — reusing the app's existing categorical
// color coding rather than inventing new ones for this image.
export function computeBadges(recipe: ParsedRecipe): CardBadge[] {
  const badges: CardBadge[] = [];
  if (recipe.mealType.length > 0) {
    badges.push({ label: "Meal", color: "purple", text: truncateList(recipe.mealType) });
  }
  if (recipe.cuisine.length > 0) {
    badges.push({ label: "Cuisine", color: "blue", text: truncateList(recipe.cuisine.map((p) => p.style)) });
  }
  if (recipe.flavorNotes.length > 0) {
    badges.push({ label: "Flavor", color: "orange", text: truncateList(recipe.flavorNotes) });
  }
  return badges;
}

export function cappedIngredients(ingredients: Ingredient[]): { shown: Ingredient[]; remaining: number } {
  return {
    shown: ingredients.slice(0, INGREDIENT_DISPLAY_CAP),
    remaining: Math.max(0, ingredients.length - INGREDIENT_DISPLAY_CAP),
  };
}

// Rough estimate of how many visual lines a string wraps to at a given font
// size within a given column width — good enough to decide how many COMPLETE
// steps fit the line budget; never used to cut a step mid-sentence.
function estimateLines(text: string, fontSizePx: number, contentWidthPx: number): number {
  const avgCharWidth = fontSizePx * 0.55;
  const charsPerLine = Math.max(1, Math.floor(contentWidthPx / avgCharWidth));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

// Includes as many COMPLETE steps as fit the line budget. The first step is
// always included in full even if it alone exceeds the budget — otherwise a
// recipe with one long step would show zero directions.
export function cappedDirections(
  directions: string[],
  fontSizePx: number,
  contentWidthPx: number = CONTENT_WIDTH,
  budget: number = DIRECTION_LINE_BUDGET
): { shown: string[]; remaining: number } {
  const shown: string[] = [];
  let usedLines = 0;

  for (const step of directions) {
    const lines = estimateLines(step, fontSizePx, contentWidthPx);
    if (shown.length > 0 && usedLines + lines > budget) break;
    shown.push(step);
    usedLines += lines;
  }

  return { shown, remaining: directions.length - shown.length };
}
