import type { Ref } from "react";
import { Ingredient, ingredientQty } from "@/lib/recipe-utils";
import { CardBadge, LOGO_ICON_SIZE, LOGO_TEXT_SIZE, LOGO_GAP } from "@/lib/recipe-card";

/**
 * Small presentational pieces shared between RecipeCardListMeasurer (which
 * measures real rendered heights off-screen) and RecipeShareCard (the final
 * capture target). Using the exact same markup/styles in both places is what
 * makes the measured heights trustworthy — if the two ever rendered a list
 * item differently, the budget math would silently stop matching reality.
 */

const badgeColorClasses: Record<"purple" | "blue" | "orange", string> = {
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
};

// App branding lockup — same icon + wordmark pairing as the NavBar header.
export function CardLogoLockup() {
  return (
    <div style={{ gap: LOGO_GAP }} className="flex items-center">
      <span style={{ fontSize: LOGO_ICON_SIZE, lineHeight: 1 }}>🍽️</span>
      <span style={{ fontSize: LOGO_TEXT_SIZE }} className="font-bold text-orange-800">
        What&apos;s For Dinner?
      </span>
    </div>
  );
}

export function CardTitle({
  name,
  fontSize,
  width,
  titleRef,
}: {
  name: string;
  fontSize: number;
  width: number;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <h1
      ref={titleRef}
      style={{ fontSize, lineHeight: 1.15, width }}
      className="font-bold text-gray-900"
    >
      {name}
    </h1>
  );
}

export function CardBadgeRow({
  badges,
  fontSize,
  rowRef,
}: {
  badges: CardBadge[];
  fontSize: number;
  rowRef?: Ref<HTMLDivElement>;
}) {
  if (badges.length === 0) return null;
  return (
    <div ref={rowRef} style={{ gap: 14 }} className="flex flex-wrap">
      {badges.map((b) => (
        <span
          key={b.label}
          style={{ fontSize, padding: "10px 24px" }}
          className={`rounded-full font-medium capitalize ${badgeColorClasses[b.color]}`}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

export function CardSectionLabel({
  children,
  fontSize,
  marginBottom,
}: {
  children: React.ReactNode;
  fontSize: number;
  marginBottom: number;
}) {
  return (
    <h2
      style={{ fontSize, marginBottom }}
      className="font-semibold text-orange-700 uppercase tracking-wide"
    >
      {children}
    </h2>
  );
}

export function IngredientLine({
  ingredient,
  itemRef,
}: {
  ingredient: Ingredient;
  itemRef?: Ref<HTMLLIElement>;
}) {
  return (
    <li ref={itemRef}>
      {ingredientQty(ingredient) && (
        <span className="font-semibold text-gray-900">{ingredientQty(ingredient)} </span>
      )}
      {ingredient.name}
    </li>
  );
}

export function DirectionLine({ step, itemRef }: { step: string; itemRef?: Ref<HTMLLIElement> }) {
  return <li ref={itemRef}>{step}</li>;
}

export function MoreLabel({
  text,
  fontSize,
  marginTop,
}: {
  text: string;
  fontSize: number;
  marginTop: number;
}) {
  return (
    <p style={{ fontSize, marginTop }} className="text-orange-400 italic">
      {text}
    </p>
  );
}
