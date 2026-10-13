/**
 * Pure layout logic for the shareable recipe card image (fixed 1080×1350
 * canvas). Three discrete density tiers — not continuous scaling — chosen by
 * total content volume. See components/RecipeShareCard.tsx for the visual
 * and components/RecipeCardListMeasurer.tsx for how real rendered heights
 * feed computeContentBudget below.
 *
 * Layout model: a PERMANENT, fixed-size QR+caption zone top-right, and a
 * logo+title column top-left (app logo/wordmark, then the recipe title
 * directly beneath it) whose width is whatever's left beside the QR zone.
 * Everything below — badges, ingredients, directions — starts beneath the
 * logo+title column's own rendered height, NOT the QR zone's height; the QR
 * zone is fixed and excluded from that calculation entirely, so empty space
 * below it (when the title column is shorter) is expected. Spacing between
 * blocks (sectionGap, header margins, "+more" label margins) is always a
 * fixed per-tier constant, so the only things that actually need DOM
 * measurement are the things whose height depends on real text content: the
 * title (1 vs 2 lines), the badge row (may wrap), and each ingredient/
 * direction line (wraps independently).
 */

import { Ingredient, ParsedRecipe } from "./recipe-utils";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
// Platforms like Instagram can crop shared images slightly at the edges.
export const SAFE_MARGIN = 64;
export const CONTENT_WIDTH = CARD_WIDTH - 2 * SAFE_MARGIN;

const QR_TILE_PADDING = 14; // white tile padding around the QR image
const CAPTION_GAP = 8; // gap between the QR tile and its caption
const HEADER_MARGIN_BOTTOM = 14;
const MORE_LABEL_MARGIN_TOP = 10;
const HEADER_COLUMN_GAP = 24; // horizontal gap between the logo+title column and the QR zone
const LOGO_TITLE_GAP = 20; // vertical gap between the logo lockup and the title beneath it

// App logo+wordmark lockup (top-left) — fixed branding, not tier-dependent.
export const LOGO_ICON_SIZE = 40;
export const LOGO_TEXT_SIZE = 32;
export const LOGO_GAP = 12;
const LOGO_BLOCK_HEIGHT = 48;

// Off-screen DOM measurement caps — purely a performance guard against
// rendering an absurd number of nodes; real recipes are always far under
// these, and anything beyond is truncated by the budget anyway.
export const MAX_MEASURED_INGREDIENTS = 40;
export const MAX_MEASURED_DIRECTIONS = 30;

export type CardTier = "generous" | "standard" | "minimal";

const STEP_VOLUME_CAP = 12;

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
  captionSize: number;
  sectionGap: number;
};

// Generous fills space mainly via line-height/gaps, not oversized type — a
// sparse recipe shouldn't look like its text was simply blown up.
export const CARD_TIER_STYLES: Record<CardTier, TierStyle> = {
  generous: {
    nameSize: 72, labelSize: 26, badgeSize: 28,
    ingredientSize: 34, ingredientLineHeight: 1.7,
    directionSize: 34, directionLineHeight: 1.75,
    qrSize: 220, captionSize: 22,
    sectionGap: 40,
  },
  standard: {
    nameSize: 62, labelSize: 23, badgeSize: 25,
    ingredientSize: 28, ingredientLineHeight: 1.45,
    directionSize: 28, directionLineHeight: 1.5,
    qrSize: 195, captionSize: 20,
    sectionGap: 32,
  },
  minimal: {
    nameSize: 52, labelSize: 20, badgeSize: 22,
    ingredientSize: 23, ingredientLineHeight: 1.3,
    directionSize: 23, directionLineHeight: 1.35,
    qrSize: 170, captionSize: 18,
    sectionGap: 24,
  },
};

// ── Zones ────────────────────────────────────────────────────────────────────
// QR+caption is a fixed box top-right; the logo+title column takes whatever
// width is left beside it. The QR zone's own height plays NO part in where
// the content zone starts — only the logo+title column's height does.

export type CardZones = {
  qrZoneWidth: number;
  qrZoneHeight: number;
  logoTitleColumnWidth: number;
};

export function computeZones(tier: CardTier): CardZones {
  const style = CARD_TIER_STYLES[tier];
  const qrZoneWidth = style.qrSize + 2 * QR_TILE_PADDING;
  const captionLineHeight = Math.round(style.captionSize * 1.3);
  const qrZoneHeight = style.qrSize + 2 * QR_TILE_PADDING + CAPTION_GAP + captionLineHeight;
  const logoTitleColumnWidth = CONTENT_WIDTH - qrZoneWidth - HEADER_COLUMN_GAP;
  return { qrZoneWidth, qrZoneHeight, logoTitleColumnWidth };
}

export { QR_TILE_PADDING, CAPTION_GAP, LOGO_TITLE_GAP };

// Where the content zone starts, and how tall it's allowed to be — the logo
// block plus the MEASURED title height (it can grow to 2 lines). The QR
// zone's height is deliberately NOT part of this — it's fixed and may leave
// visible empty space beneath it when the title column is shorter.
export function computeContentZoneTop(titleHeight: number, tier: CardTier): number {
  const gap = CARD_TIER_STYLES[tier].sectionGap;
  return LOGO_BLOCK_HEIGHT + LOGO_TITLE_GAP + titleHeight + gap;
}

export function computeAvailableContentHeight(contentZoneTop: number): number {
  return CARD_HEIGHT - 2 * SAFE_MARGIN - contentZoneTop;
}

// ── Badges ───────────────────────────────────────────────────────────────────

export type CardBadge = { label: string; color: "purple" | "blue" | "orange"; text: string };

// Up to `max` values inline, "+N" suffix for the rest. Empty input → "".
export function truncateList(values: string[], max = 2): string {
  if (values.length === 0) return "";
  const shown = values.slice(0, max).join(", ");
  return values.length > max ? `${shown} +${values.length - max}` : shown;
}

// Fixed order, colors matching the same Chip mapping used on the recipe
// detail page — reusing the app's existing categorical color coding.
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

export function cappedIngredientsForMeasurement(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.slice(0, MAX_MEASURED_INGREDIENTS);
}

export function cappedDirectionsForMeasurement(directions: string[]): string[] {
  return directions.slice(0, MAX_MEASURED_DIRECTIONS);
}

function singleLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.2);
}

function headerBlockHeight(labelSize: number): number {
  return singleLineHeight(labelSize) + HEADER_MARGIN_BOTTOM;
}

function moreLabelBlockHeight(itemFontSize: number): number {
  return singleLineHeight(itemFontSize * 0.8) + MORE_LABEL_MARGIN_TOP;
}

export const HEADER_GAP = HEADER_MARGIN_BOTTOM;
export const MORE_GAP = MORE_LABEL_MARGIN_TOP;

// ── Dynamic content budget ───────────────────────────────────────────────────
// Replaces the old character-count-estimate caps with real measured heights.

export type ContentMeasurements = {
  titleHeight: number;
  badgesHeight: number; // 0 if no badges
  ingredientHeights: number[]; // per measured item, in order
  directionHeights: number[]; // per measured item, in order
};

export type ContentBudget = {
  ingredientsShown: number;
  ingredientsRemaining: number;
  directionsShown: number;
  directionsRemaining: number;
};

// Ingredients are rendered first; if they'd leave insufficient room for at
// least ~2 directions, they're truncated too, not just directions. Within
// each list, the first item is always included in full even if it alone
// exceeds its budget — never truncate a line (or step) mid-sentence.
export function computeContentBudget(
  m: ContentMeasurements,
  totalIngredients: number,
  totalDirections: number,
  availableHeight: number,
  tier: CardTier
): ContentBudget {
  const style = CARD_TIER_STYLES[tier];
  const gap = style.sectionGap;
  const hasBadges = m.badgesHeight > 0;
  const hasIngredients = totalIngredients > 0;
  const hasDirections = totalDirections > 0;

  const ingHeaderH = hasIngredients ? headerBlockHeight(style.labelSize) : 0;
  const dirHeaderH = hasDirections ? headerBlockHeight(style.labelSize) : 0;
  const ingMoreH = moreLabelBlockHeight(style.ingredientSize);
  const dirMoreH = moreLabelBlockHeight(style.directionSize);
  const badgesUsed = hasBadges ? m.badgesHeight + gap : 0;

  // Reserve room for the directions header + first ~2 steps BEFORE deciding
  // how many ingredients fit.
  let directionsReserve = 0;
  if (hasDirections) {
    directionsReserve = dirHeaderH + gap;
    const reserveCount = Math.min(2, m.directionHeights.length);
    for (let i = 0; i < reserveCount; i++) directionsReserve += m.directionHeights[i];
  }

  let ingCount = 0;
  let ingUsed = 0;
  if (hasIngredients) {
    const ingredientBudget = availableHeight - badgesUsed - directionsReserve - ingHeaderH - ingMoreH;
    for (; ingCount < m.ingredientHeights.length; ingCount++) {
      const h = m.ingredientHeights[ingCount];
      if (ingCount > 0 && ingUsed + h > ingredientBudget) break;
      ingUsed += h;
    }
  }
  const ingredientsRemaining = totalIngredients - ingCount;

  const ingredientsBlockHeight = hasIngredients
    ? ingHeaderH + ingUsed + (ingredientsRemaining > 0 ? ingMoreH : 0)
    : 0;

  if (!hasDirections) {
    return { ingredientsShown: ingCount, ingredientsRemaining, directionsShown: 0, directionsRemaining: 0 };
  }

  // Directions get whatever space the ACTUALLY-used ingredient block leaves.
  const usedBeforeDirections = badgesUsed + ingredientsBlockHeight + (hasIngredients ? gap : 0) + dirHeaderH;
  const directionsAvailable = availableHeight - usedBeforeDirections - dirMoreH;

  let dirCount = 0;
  let dirUsed = 0;
  for (; dirCount < m.directionHeights.length; dirCount++) {
    const h = m.directionHeights[dirCount];
    if (dirCount > 0 && dirUsed + h > directionsAvailable) break;
    dirUsed += h;
  }
  const directionsRemaining = totalDirections - dirCount;

  return { ingredientsShown: ingCount, ingredientsRemaining, directionsShown: dirCount, directionsRemaining };
}
