"use client";

import { useLayoutEffect, useRef } from "react";
import { Ingredient } from "@/lib/recipe-utils";
import {
  CardTier,
  CardBadge,
  CARD_TIER_STYLES,
  CONTENT_WIDTH,
  computeZones,
  ContentMeasurements,
} from "@/lib/recipe-card";
import { CardTitle, CardBadgeRow, IngredientLine, DirectionLine } from "@/components/RecipeCardParts";

/**
 * Renders the content whose height actually depends on text (title, badge
 * row, each ingredient/direction line) off-screen with the exact same markup
 * used by the final card, then reports measured heights via onMeasured.
 * Spacing between blocks (gaps, header/label margins) is NOT measured here —
 * those are fixed per-tier constants applied identically in both passes, so
 * only genuinely content-dependent heights need real DOM measurement.
 */
export function RecipeCardListMeasurer({
  name,
  ingredients,
  directions,
  badges,
  tier,
  onMeasured,
}: {
  name: string;
  ingredients: Ingredient[];
  directions: string[];
  badges: CardBadge[];
  tier: CardTier;
  onMeasured: (m: ContentMeasurements) => void;
}) {
  const style = CARD_TIER_STYLES[tier];
  const zones = computeZones(tier);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const ingItemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const dirItemRefs = useRef<(HTMLLIElement | null)[]>([]);

  useLayoutEffect(() => {
    const height = (el: HTMLElement | null) => el?.getBoundingClientRect().height ?? 0;
    onMeasured({
      titleHeight: height(titleRef.current),
      badgesHeight: badges.length > 0 ? height(badgesRef.current) : 0,
      ingredientHeights: ingItemRefs.current.slice(0, ingredients.length).map(height),
      directionHeights: dirItemRefs.current.slice(0, directions.length).map(height),
    });
    // Intentionally measure exactly once per mount — this component is
    // remounted fresh for every capture attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }} aria-hidden>
      <div style={{ width: CONTENT_WIDTH, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <CardTitle name={name} fontSize={style.nameSize} width={zones.logoTitleColumnWidth} titleRef={titleRef} />

        <CardBadgeRow badges={badges} fontSize={style.badgeSize} rowRef={badgesRef} />

        <ul style={{ fontSize: style.ingredientSize, lineHeight: style.ingredientLineHeight }} className="list-none">
          {ingredients.map((ing, i) => (
            <IngredientLine key={i} ingredient={ing} itemRef={(el) => { ingItemRefs.current[i] = el; }} />
          ))}
        </ul>

        <ol
          style={{ fontSize: style.directionSize, lineHeight: style.directionLineHeight }}
          className="list-decimal list-outside ml-[1.3em]"
        >
          {directions.map((step, i) => (
            <DirectionLine key={i} step={step} itemRef={(el) => { dirItemRefs.current[i] = el; }} />
          ))}
        </ol>
      </div>
    </div>
  );
}
