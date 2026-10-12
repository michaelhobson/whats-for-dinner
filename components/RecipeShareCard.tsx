import { ParsedRecipe, ingredientQty } from "@/lib/recipe-utils";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  SAFE_MARGIN,
  CONTENT_WIDTH,
  computeCardTier,
  CARD_TIER_STYLES,
  computeBadges,
  cappedIngredients,
  cappedDirections,
} from "@/lib/recipe-card";

const badgeColorClasses: Record<"purple" | "blue" | "orange", string> = {
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
};

// The actual 1080×1350 shareable card — rendered off-screen and rasterized
// to PNG via html-to-image (see ShareImageButton). Uses the app's existing
// orange palette and plain system sans-serif stack (the app's real rendered
// font everywhere — see globals.css's `body` rule) rather than introducing
// new styling choices just for this image.
export function RecipeShareCard({
  recipe,
  qrDataUrl,
}: {
  recipe: ParsedRecipe;
  qrDataUrl: string;
}) {
  const tier = computeCardTier(recipe);
  const style = CARD_TIER_STYLES[tier];
  const badges = computeBadges(recipe);
  const { shown: shownIngredients, remaining: remainingIngredients } = cappedIngredients(recipe.ingredients);
  const { shown: shownDirections, remaining: remainingDirections } = cappedDirections(
    recipe.directions,
    style.directionSize,
    CONTENT_WIDTH
  );

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        padding: SAFE_MARGIN,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
      className="bg-orange-50 flex flex-col"
    >
      {/* Name */}
      <h1
        style={{ fontSize: style.nameSize, lineHeight: 1.15, marginBottom: style.sectionGap }}
        className="font-bold text-gray-900"
      >
        {recipe.name}
      </h1>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ marginBottom: style.sectionGap, gap: 14 }} className="flex flex-wrap">
          {badges.map((b) => (
            <span
              key={b.label}
              style={{ fontSize: style.badgeSize, padding: "10px 24px" }}
              className={`rounded-full font-medium capitalize ${badgeColorClasses[b.color]}`}
            >
              {b.text}
            </span>
          ))}
        </div>
      )}

      {/* Ingredients */}
      <div style={{ marginBottom: style.sectionGap }}>
        <h2
          style={{ fontSize: style.labelSize, marginBottom: 14 }}
          className="font-semibold text-orange-700 uppercase tracking-wide"
        >
          Ingredients
        </h2>
        <ul
          style={{ fontSize: style.ingredientSize, lineHeight: style.ingredientLineHeight }}
          className="text-gray-700 list-none"
        >
          {shownIngredients.map((ing, i) => (
            <li key={i}>
              {ingredientQty(ing) && (
                <span className="font-semibold text-gray-900">{ingredientQty(ing)} </span>
              )}
              {ing.name}
            </li>
          ))}
        </ul>
        {remainingIngredients > 0 && (
          <p style={{ fontSize: style.ingredientSize * 0.8, marginTop: 10 }} className="text-orange-400 italic">
            +{remainingIngredients} more ingredients
          </p>
        )}
      </div>

      {/* Directions */}
      <div className="flex-1 min-h-0" style={{ marginBottom: style.sectionGap }}>
        <h2
          style={{ fontSize: style.labelSize, marginBottom: 14 }}
          className="font-semibold text-orange-700 uppercase tracking-wide"
        >
          Directions
        </h2>
        <ol
          style={{ fontSize: style.directionSize, lineHeight: style.directionLineHeight }}
          className="text-gray-700 list-decimal list-outside ml-[1.3em] space-y-1"
        >
          {shownDirections.map((step, i) => (
            <li key={i} className="pl-1">{step}</li>
          ))}
        </ol>
        {remainingDirections > 0 && (
          <p style={{ fontSize: style.directionSize * 0.8, marginTop: 10 }} className="text-orange-400 italic">
            +{remainingDirections} more steps
          </p>
        )}
      </div>

      {/* QR + branding, anchored at the bottom */}
      <div className="mt-auto flex items-end justify-between">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 40, lineHeight: 1 }}>🍽️</span>
          <span style={{ fontSize: 30 }} className="font-bold text-orange-800">
            What&apos;s For Dinner?
          </span>
        </div>
        <div
          style={{ padding: 14 }}
          className="bg-white rounded-2xl border border-orange-100 shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            width={style.qrSize}
            height={style.qrSize}
            alt=""
            style={{ display: "block", width: style.qrSize, height: style.qrSize }}
          />
        </div>
      </div>
    </div>
  );
}
