"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { generateShareLink, revokeShareLink } from "@/app/actions/share";
import { ShareImageButton } from "@/components/ShareImageButton";
import { ParsedRecipe } from "@/lib/recipe-utils";

// Icon-button + popover, same interaction pattern as OverflowMenu/KitchenSwitcher:
// a relatively-positioned trigger with an absolutely-positioned panel, closed on
// outside click or Escape. The row this sits in never changes height — only the
// popover's own contents vary with share-link state.
export function ShareRecipeButton({
  recipeId,
  recipe,
  initialToken,
  canManage,
}: {
  recipeId: number;
  recipe: ParsedRecipe;
  initialToken: string | null;
  canManage: boolean;
}) {
  const [token, setToken] = useState(initialToken);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const shareUrl = token ? `${origin}/share/${token}` : null;

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateShareLink(recipeId);
      if (result.ok) setToken(result.token);
      else setError(result.error);
    });
  }

  function handleRevoke() {
    if (!confirm("Revoke this share link? Anyone with the old link will lose access.")) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeShareLink(recipeId);
      if (result.ok) setToken(null);
      else setError(result.error);
    });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the link text is still selectable in the input.
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Share recipe"
        aria-expanded={open}
        className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${
          open
            ? "bg-orange-50 border-orange-300 text-orange-700"
            : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5" aria-hidden>
          <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.367A2.5 2.5 0 0 1 13 4.5Z" />
        </svg>
      </button>

      {/* Popover panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Share link</h3>

          {!token && canManage && (
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 transition-colors"
            >
              {isPending ? "Creating…" : "Create share link"}
            </button>
          )}

          {!token && !canManage && (
            <p className="text-sm text-gray-500">No share link yet.</p>
          )}

          {token && shareUrl && (
            <div className="space-y-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                {canManage && (
                  <button
                    onClick={handleRevoke}
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
              <ShareImageButton recipe={recipe} shareUrl={shareUrl} />
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
