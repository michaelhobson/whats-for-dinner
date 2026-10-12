"use client";

import { useEffect, useState, useTransition } from "react";
import { generateShareLink, revokeShareLink } from "@/app/actions/share";

export function ShareRecipeSection({
  recipeId,
  initialToken,
  canManage,
}: {
  recipeId: number;
  initialToken: string | null;
  canManage: boolean;
}) {
  const [token, setToken] = useState(initialToken);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

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

  // Diner with no active link: nothing to manage, nothing to show.
  if (!token && !canManage) return null;

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm px-5 py-4 space-y-3 mb-10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Share link</h3>
        {canManage && !token && (
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            {isPending ? "Creating…" : "Create share link"}
          </button>
        )}
      </div>

      {token && shareUrl && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          {canManage && (
            <button
              onClick={handleRevoke}
              disabled={isPending}
              className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
            >
              Revoke
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
