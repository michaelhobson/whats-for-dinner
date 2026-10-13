import { ParsedRecipe, Ingredient } from "@/lib/recipe-utils";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  SAFE_MARGIN,
  CONTENT_WIDTH,
  CardTier,
  CARD_TIER_STYLES,
  computeZones,
  computeBadges,
  QR_TILE_PADDING,
  HEADER_GAP,
  MORE_GAP,
} from "@/lib/recipe-card";
import {
  CardTitle,
  CardBadgeRow,
  CardSectionLabel,
  IngredientLine,
  DirectionLine,
  MoreLabel,
} from "@/components/RecipeCardParts";

/**
 * The actual 1080×1350 shareable card — rendered off-screen and rasterized
 * to PNG via html-to-image (see ShareImageButton). Every piece of content is
 * placed in a dedicated zone computed ahead of time by ShareImageButton (via
 * a measurement pass + computeContentBudget); this component only renders
 * the already-decided layout, it doesn't make truncation decisions itself.
 */
export function RecipeShareCard({
  recipe,
  tier,
  qrDataUrl,
  ingredientsShown,
  ingredientsRemaining,
  directionsShown,
  directionsRemaining,
  contentZoneTop,
}: {
  recipe: ParsedRecipe;
  tier: CardTier;
  qrDataUrl: string;
  ingredientsShown: Ingredient[];
  ingredientsRemaining: number;
  directionsShown: string[];
  directionsRemaining: number;
  contentZoneTop: number;
}) {
  const style = CARD_TIER_STYLES[tier];
  const zones = computeZones(tier);
  const badges = computeBadges(recipe);
  const contentZoneHeight = CARD_HEIGHT - SAFE_MARGIN - (SAFE_MARGIN + contentZoneTop);

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
      }}
      className="bg-orange-50"
    >
      {/* Logo zone — top-left, permanent, never overlapped by other content */}
      <div
        style={{
          position: "absolute",
          top: SAFE_MARGIN,
          left: SAFE_MARGIN,
          width: zones.logoZoneWidth,
          height: zones.cornerZoneHeight,
        }}
        className="flex items-start"
      >
        <span style={{ fontSize: style.logoIconSize, lineHeight: 1 }}>🍽️</span>
      </div>

      {/* QR zone — top-right, permanent, never overlapped by other content */}
      <div
        style={{
          position: "absolute",
          top: SAFE_MARGIN,
          right: SAFE_MARGIN,
          width: zones.qrZoneWidth,
          height: zones.cornerZoneHeight,
        }}
        className="flex flex-col items-center"
      >
        <div style={{ padding: QR_TILE_PADDING }} className="bg-white rounded-2xl border border-orange-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            width={style.qrSize}
            height={style.qrSize}
            alt=""
            style={{ display: "block", width: style.qrSize, height: style.qrSize }}
          />
        </div>
        <p style={{ fontSize: style.captionSize, marginTop: 8 }} className="text-orange-700 text-center">
          Scan for the full recipe
        </p>
      </div>

      {/* Title — constrained to the column between the two corner zones;
          wraps to a 2nd line rather than ever shrinking or overlapping */}
      <div
        style={{ position: "absolute", top: SAFE_MARGIN, left: SAFE_MARGIN + zones.titleColumnLeft, width: zones.titleColumnWidth }}
      >
        <CardTitle name={recipe.name} fontSize={style.nameSize} width={zones.titleColumnWidth} />
      </div>

      {/* Content zone — strictly bounded between the title/corner row and the
          bottom safe margin. overflow:hidden is a defensive backstop only;
          the budget math above is what's actually supposed to make this fit. */}
      <div
        style={{
          position: "absolute",
          top: SAFE_MARGIN + contentZoneTop,
          left: SAFE_MARGIN,
          width: CONTENT_WIDTH,
          height: contentZoneHeight,
          overflow: "hidden",
        }}
      >
        {badges.length > 0 && (
          <>
            <CardBadgeRow badges={badges} fontSize={style.badgeSize} />
            <div style={{ height: style.sectionGap }} />
          </>
        )}

        {ingredientsShown.length > 0 && (
          <>
            <CardSectionLabel fontSize={style.labelSize} marginBottom={HEADER_GAP}>
              Ingredients
            </CardSectionLabel>
            <ul
              style={{ fontSize: style.ingredientSize, lineHeight: style.ingredientLineHeight }}
              className="text-gray-700 list-none"
            >
              {ingredientsShown.map((ing, i) => (
                <IngredientLine key={i} ingredient={ing} />
              ))}
            </ul>
            {ingredientsRemaining > 0 && (
              <MoreLabel
                text={`+${ingredientsRemaining} more ingredients`}
                fontSize={style.ingredientSize * 0.8}
                marginTop={MORE_GAP}
              />
            )}
            <div style={{ height: style.sectionGap }} />
          </>
        )}

        {directionsShown.length > 0 && (
          <>
            <CardSectionLabel fontSize={style.labelSize} marginBottom={HEADER_GAP}>
              Directions
            </CardSectionLabel>
            <ol
              style={{ fontSize: style.directionSize, lineHeight: style.directionLineHeight }}
              className="text-gray-700 list-decimal list-outside ml-[1.3em]"
            >
              {directionsShown.map((step, i) => (
                <DirectionLine key={i} step={step} />
              ))}
            </ol>
            {directionsRemaining > 0 && (
              <MoreLabel
                text={`+${directionsRemaining} more steps`}
                fontSize={style.directionSize * 0.8}
                marginTop={MORE_GAP}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
