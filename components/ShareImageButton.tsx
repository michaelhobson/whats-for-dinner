"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { generateQrDataUrl } from "@/lib/qr";
import {
  computeCardTier,
  computeBadges,
  computeContentZoneTop,
  computeAvailableContentHeight,
  computeContentBudget,
  cappedIngredientsForMeasurement,
  cappedDirectionsForMeasurement,
  CARD_TIER_STYLES,
  CARD_WIDTH,
  CARD_HEIGHT,
  ContentBudget,
  ContentMeasurements,
} from "@/lib/recipe-card";
import { RecipeCardListMeasurer } from "@/components/RecipeCardListMeasurer";
import { RecipeShareCard } from "@/components/RecipeShareCard";
import { ParsedRecipe } from "@/lib/recipe-utils";

type Phase = "idle" | "measuring" | "capturing" | "error";

function fileNameFor(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (slug || "recipe") + ".png";
}

// Pipeline: generate the QR → mount an off-screen measurer that reports real
// rendered heights for the title/badges/each list line → compute how much of
// each list fits (computeContentBudget) → mount the FINAL card with that
// decided content → capture it → share or download. Two separate off-screen
// mounts (never both at once) because the measurer renders the full,
// untruncated lists while the final card renders only the decided subset.
export function ShareImageButton({ recipe, shareUrl }: { recipe: ParsedRecipe; shareUrl: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [final, setFinal] = useState<{ qrDataUrl: string; budget: ContentBudget; contentZoneTop: number } | null>(null);

  const qrDataUrlRef = useRef<string>("");
  const finalCardRef = useRef<HTMLDivElement>(null);

  const tier = computeCardTier(recipe);
  const badges = computeBadges(recipe);
  const measuredIngredients = cappedIngredientsForMeasurement(recipe.ingredients);
  const measuredDirections = cappedDirectionsForMeasurement(recipe.directions);

  async function handleClick() {
    setMessage(null);
    setFinal(null);
    try {
      // Generate the QR BEFORE mounting the measurer — the measurer's layout
      // effect can fire within a frame or two, and if phase flipped to
      // "measuring" first, the eventual final card could mount with
      // qrDataUrlRef.current still empty (a real race this app used to hit).
      qrDataUrlRef.current = await generateQrDataUrl(shareUrl, CARD_TIER_STYLES[tier].qrSize);
      setPhase("measuring");
    } catch (e) {
      console.error("Share-as-image: QR generation failed", e);
      setPhase("error");
      setMessage("Couldn't generate the QR code — please try again.");
    }
    // The measurer mounts below now that phase === "measuring"; handleMeasured continues the pipeline.
  }

  function handleMeasured(m: ContentMeasurements) {
    const contentZoneTop = computeContentZoneTop(m.titleHeight, tier);
    const availableHeight = computeAvailableContentHeight(contentZoneTop);
    const budget = computeContentBudget(
      m,
      recipe.ingredients.length,
      recipe.directions.length,
      availableHeight,
      tier
    );
    setFinal({ qrDataUrl: qrDataUrlRef.current, budget, contentZoneTop });
    setPhase("capturing");
  }

  // Once the final card is mounted off-screen, capture a couple of frames
  // later so the browser has actually painted it first.
  useEffect(() => {
    if (phase !== "capturing" || !final) return;
    let cancelled = false;

    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        if (cancelled || !finalCardRef.current) return;
        try {
          const dataUrl = await toPng(finalCardRef.current, {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            pixelRatio: 1,
            backgroundColor: "#fff7ed",
            // The card only ever uses system fonts (see RecipeShareCard), but
            // Next.js's font loader still injects unused Geist @font-face
            // rules into the document — html-to-image would otherwise try to
            // download and embed those on every capture, which is a common
            // source of capture failures for no visual benefit here.
            skipFonts: true,
          });
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileNameFor(recipe.name), { type: "image/png" });

          if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: recipe.name });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            if (!cancelled) setMessage("Image downloaded — ready to share manually.");
          }
          if (!cancelled) setPhase("idle");
        } catch (e) {
          if (cancelled) return;
          // The user cancelling the native share sheet isn't an error.
          if (e instanceof Error && e.name === "AbortError") {
            setPhase("idle");
          } else {
            console.error("Share-as-image: capture/share failed", e);
            setPhase("error");
            setMessage("Couldn't generate the image — please try again.");
          }
        } finally {
          if (!cancelled) setFinal(null);
        }
      })
    );

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, final]);

  const working = phase === "measuring" || phase === "capturing";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={working}
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {working ? "Preparing image…" : "Share as image"}
      </button>
      {message && <p className="text-xs text-gray-500 mt-1.5">{message}</p>}

      {phase === "measuring" && (
        <RecipeCardListMeasurer
          name={recipe.name}
          ingredients={measuredIngredients}
          directions={measuredDirections}
          badges={badges}
          tier={tier}
          onMeasured={handleMeasured}
        />
      )}

      {phase === "capturing" && final && (
        <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div ref={finalCardRef}>
            <RecipeShareCard
              recipe={recipe}
              tier={tier}
              qrDataUrl={final.qrDataUrl}
              ingredientsShown={recipe.ingredients.slice(0, final.budget.ingredientsShown)}
              ingredientsRemaining={final.budget.ingredientsRemaining}
              directionsShown={recipe.directions.slice(0, final.budget.directionsShown)}
              directionsRemaining={final.budget.directionsRemaining}
              contentZoneTop={final.contentZoneTop}
            />
          </div>
        </div>
      )}
    </>
  );
}
