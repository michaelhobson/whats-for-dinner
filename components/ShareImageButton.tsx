"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { generateQrDataUrl } from "@/lib/qr";
import { computeCardTier, CARD_TIER_STYLES, CARD_WIDTH, CARD_HEIGHT } from "@/lib/recipe-card";
import { RecipeShareCard } from "@/components/RecipeShareCard";
import { ParsedRecipe } from "@/lib/recipe-utils";

type Status = "idle" | "working" | "error";

function fileNameFor(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (slug || "recipe") + ".png";
}

export function ShareImageButton({ recipe, shareUrl }: { recipe: ParsedRecipe; shareUrl: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Only mounted (off-screen) while a capture is in flight — avoids needing
  // a placeholder <img> before the QR data URL exists.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  function handleClick() {
    setMessage(null);
    setStatus("working");
    generateQrDataUrl(shareUrl, CARD_TIER_STYLES[computeCardTier(recipe)].qrSize)
      .then(setQrDataUrl)
      .catch(() => {
        setStatus("error");
        setMessage("Couldn't generate the image — please try again.");
      });
  }

  // Once the QR is ready, the hidden card mounts with it. Capture a couple of
  // frames later so the browser has actually painted the new <img> first.
  useEffect(() => {
    if (status !== "working" || !qrDataUrl) return;
    let cancelled = false;

    const raf2 = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(async () => {
          if (cancelled || !cardRef.current) return;
          try {
            const dataUrl = await toPng(cardRef.current, {
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              pixelRatio: 1,
              backgroundColor: "#fff7ed",
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
            if (!cancelled) setStatus("idle");
          } catch (e) {
            if (cancelled) return;
            // The user cancelling the native share sheet isn't an error.
            if (e instanceof Error && e.name === "AbortError") {
              setStatus("idle");
            } else {
              setStatus("error");
              setMessage("Couldn't generate the image — please try again.");
            }
          } finally {
            if (!cancelled) setQrDataUrl(null);
          }
        })
      );

    raf2();
    return () => { cancelled = true; };
  }, [status, qrDataUrl, recipe, shareUrl]);

  return (
    <>
      <button
        onClick={handleClick}
        disabled={status === "working"}
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {status === "working" ? "Preparing image…" : "Share as image"}
      </button>
      {message && <p className="text-xs text-gray-500 mt-1.5">{message}</p>}

      {/* Off-screen render target for html-to-image — real layout, never visible. */}
      {qrDataUrl && (
        <div style={{ position: "fixed", left: -9999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div ref={cardRef}>
            <RecipeShareCard recipe={recipe} qrDataUrl={qrDataUrl} />
          </div>
        </div>
      )}
    </>
  );
}
