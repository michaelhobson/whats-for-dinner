"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { importFromUrl, ImportedRecipeData, ImportUrlState } from "@/app/actions/import-url";
import { importFromPhoto, ImportedPhotoData, ImportPhotoState } from "@/app/actions/import-photo";
import { createRecipe } from "@/app/actions/recipes";
import AddRecipeForm from "./AddRecipeForm";
import { ParsedRecipe } from "@/lib/recipe-utils";

// Resize the image in-browser so its longest edge ≤ 1568 px (the resolution
// Claude's vision models use internally), then re-encode as JPEG at 80%.
// Only downscales — never upscales a smaller image.
// Returns a Blob ready to append to FormData.
async function compressImage(file: File): Promise<Blob> {
  const MAX_EDGE = 1568;
  const QUALITY = 0.8;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: w, naturalHeight: h } = img;

      if (w > MAX_EDGE || h > MAX_EDGE) {
        if (w >= h) {
          h = Math.round((h * MAX_EDGE) / w);
          w = MAX_EDGE;
        } else {
          w = Math.round((w * MAX_EDGE) / h);
          h = MAX_EDGE;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image failed to load"));
    };

    img.src = objectUrl;
  });
}

// Build a ParsedRecipe shell from import data so AddRecipeForm can use it.
// id=0 signals "create mode" (AddRecipeForm checks id > 0 for edit mode).
// Tag fields (mealType, cuisine, flavorNotes, season, cookingMethod) are left
// empty intentionally — the user fills those in manually after import.
function toInitialData(recipe: {
  name: string;
  ingredients: { name: string; amount?: string; unit?: string }[];
  directions: string[];
  prepTime: number | null;
  sourceUrl?: string;
}): ParsedRecipe {
  return {
    id: 0,
    name: recipe.name,
    mainProtein: null,
    mainStarch: null,
    mainVegetable: null,
    ingredients: recipe.ingredients,
    directions: recipe.directions,
    favorite: false,
    dishCategory: null,
    difficulty: "medium",
    prepTime: recipe.prepTime ?? 30,
    mealType: [],
    cuisine: [],
    flavorNotes: [],
    season: [],
    cookingMethod: [],
    rating: null,
    notes: null,
    sourceUrl: recipe.sourceUrl ?? null,
    forkedFromRecipeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

type LastImport =
  | { type: "url"; recipe: ImportedRecipeData }
  | { type: "photo"; recipe: ImportedPhotoData }
  | null;

export function ImportAndCreateForm() {
  const [importUrlState, importUrlAction, isImportingUrl] = useActionState<
    ImportUrlState,
    FormData
  >(importFromUrl, null);

  const [importPhotoState, importPhotoAction, isImportingPhoto] =
    useActionState<ImportPhotoState, FormData>(importFromPhoto, null);

  // Track which import ran most recently so the form always reflects the latest.
  // A ref-based serial ensures a unique key even for repeated imports of the same recipe.
  const importSerialRef = useRef(0);
  const [lastImport, setLastImport] = useState<LastImport>(null);
  const [formKey, setFormKey] = useState("__manual__");

  useEffect(() => {
    if (importUrlState?.ok) {
      importSerialRef.current += 1;
      setLastImport({ type: "url", recipe: importUrlState.recipe });
      setFormKey(`url:${importSerialRef.current}`);
    }
  }, [importUrlState]);

  useEffect(() => {
    if (importPhotoState?.ok) {
      importSerialRef.current += 1;
      setLastImport({ type: "photo", recipe: importPhotoState.recipe });
      setFormKey(`photo:${importSerialRef.current}`);
    }
  }, [importPhotoState]);

  const initialData = lastImport ? toInitialData(lastImport.recipe) : undefined;

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressError, setCompressError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressError(null);
    setCompressing(true);
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      // Keep a .jpg extension regardless of original; MIME type comes from the Blob.
      const stem = file.name.replace(/\.[^.]+$/, "");
      fd.append("image", blob, `${stem}.jpg`);
      importPhotoAction(fd);
    } catch {
      setCompressError("Couldn't process that image — please try a different photo.");
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Import options ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* URL import */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Import from URL
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-500">
              Paste a link to any recipe page and we&apos;ll pre-fill what we
              can find.
            </p>
            <form action={importUrlAction} className="flex gap-2">
              <input
                type="url"
                name="url"
                placeholder="https://..."
                className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={isImportingUrl}
                className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {isImportingUrl ? "Fetching…" : "Import"}
              </button>
            </form>

            {importUrlState?.ok === false && (
              <p className="text-sm text-red-600">{importUrlState.error}</p>
            )}
            {importUrlState?.ok === true && lastImport?.type === "url" && (
              <p className="text-sm text-green-700">
                ✓ Recipe found — form pre-filled below.
              </p>
            )}
          </div>
        </div>

        {/* Photo import */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Import from Photo
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-500">
              Upload a photo of a recipe card, cookbook page, or handwritten
              recipe.
            </p>
            {/* Hidden file input — triggered by the visible button below */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => {
                // Reset so the same file can be re-selected if needed
                if (photoInputRef.current) photoInputRef.current.value = "";
                photoInputRef.current?.click();
              }}
              disabled={compressing || isImportingPhoto}
              className="w-full px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {compressing
                ? "Compressing image…"
                : isImportingPhoto
                  ? "Reading photo…"
                  : "Choose photo"}
            </button>

            {compressError && (
              <p className="text-sm text-red-600">{compressError}</p>
            )}
            {importPhotoState?.ok === false && (
              <p className="text-sm text-red-600">{importPhotoState.error}</p>
            )}
            {importPhotoState?.ok === true && lastImport?.type === "photo" && (
              <p className="text-sm text-green-700">
                ✓ Recipe extracted — form pre-filled below.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Add-recipe form (pre-filled on import, blank otherwise) ── */}
      {/* key remounts AddRecipeForm whenever a new import lands so
          controlled state (name, ingredients, directions) reinitialises */}
      <AddRecipeForm
        key={formKey}
        serverAction={createRecipe}
        initialData={initialData}
      />
    </div>
  );
}
