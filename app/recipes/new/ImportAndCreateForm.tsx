"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { importFromUrl, ImportedRecipeData, ImportUrlState } from "@/app/actions/import-url";
import { importFromPhoto, ImportedPhotoData, ImportPhotoState } from "@/app/actions/import-photo";
import { createRecipe } from "@/app/actions/recipes";
import AddRecipeForm from "./AddRecipeForm";
import { ParsedRecipe } from "@/lib/recipe-utils";

// ── Image compression ─────────────────────────────────────────────────────────
// Resize in-browser so the longest edge ≤ 1568 px (Claude vision models resize
// to this internally anyway), re-encode as JPEG at 80%. Only downscales.
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
        if (w >= h) { h = Math.round((h * MAX_EDGE) / w); w = MAX_EDGE; }
        else         { w = Math.round((w * MAX_EDGE) / h); h = MAX_EDGE; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image failed to load")); };
    img.src = objectUrl;
  });
}

// ── Photo staging ─────────────────────────────────────────────────────────────

type PhotoEntry = {
  id: string;
  file: File;
  previewUrl: string; // object URL, revoked on removal or after successful import
};

const MAX_PHOTOS = 5;
const VALID_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function isValidImageType(file: File): boolean {
  return VALID_IMAGE_TYPES.has(file.type.toLowerCase().replace("image/jpg", "image/jpeg"));
}

// ── Initial data conversion ───────────────────────────────────────────────────
// Build a ParsedRecipe shell so AddRecipeForm can pre-fill. id=0 → create mode.
// Tag fields are left empty on purpose — the user fills them in before saving.
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

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportAndCreateForm() {
  // ── Import actions ──
  const [importUrlState, importUrlAction, isImportingUrl] = useActionState<
    ImportUrlState,
    FormData
  >(importFromUrl, null);

  const [importPhotoState, importPhotoAction, isImportingPhoto] =
    useActionState<ImportPhotoState, FormData>(importFromPhoto, null);

  // ── Which import filled the form most recently ──
  // Serial ref gives a unique key even when the same recipe is imported twice.
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
      // Revoke all preview URLs and clear staged photos after a successful import
      setPhotos((prev) => { prev.forEach((p) => URL.revokeObjectURL(p.previewUrl)); return []; });
    }
  }, [importPhotoState]);

  const initialData = lastImport ? toInitialData(lastImport.recipe) : undefined;

  // ── Photo staging state ──
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<string | null>(null);
  const [compressError, setCompressError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter(isValidImageType);
    setPhotos((prev) => {
      const slots = MAX_PHOTOS - prev.length;
      const toAdd = selected.slice(0, slots).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...toAdd];
    });
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function movePhoto(id: string, direction: -1 | 1) {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  async function handleImport() {
    if (photos.length === 0) return;
    setCompressError(null);
    setCompressing(true);
    try {
      const fd = new FormData();
      for (let i = 0; i < photos.length; i++) {
        setCompressionProgress(
          photos.length > 1
            ? `Compressing photo ${i + 1} of ${photos.length}…`
            : "Compressing image…"
        );
        const blob = await compressImage(photos[i].file);
        const stem = photos[i].file.name.replace(/\.[^.]+$/, "");
        fd.append("image", blob, `${stem}.jpg`);
      }
      importPhotoAction(fd);
    } catch {
      setCompressError("Couldn't process one or more images — please try different photos.");
    } finally {
      setCompressing(false);
      setCompressionProgress(null);
    }
  }

  const isPhotoWorking = compressing || isImportingPhoto;
  const photoButtonLabel = compressing
    ? (compressionProgress ?? "Compressing…")
    : isImportingPhoto
      ? `Reading photo${photos.length !== 1 ? "s" : ""}…`
      : `Import ${photos.length} photo${photos.length !== 1 ? "s" : ""}`;

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Import options — side-by-side on wider screens, stacked on mobile */}
      <div className="grid gap-4 sm:grid-cols-2 items-start">

        {/* URL import */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Import from URL
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-500">
              Paste a link to any recipe page and we&apos;ll pre-fill what we can find.
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
              <p className="text-sm text-green-700">✓ Recipe found — form pre-filled below.</p>
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
              Upload up to {MAX_PHOTOS} photos of a recipe card, cookbook pages, or handwritten recipe.
              Arrange them in reading order before importing.
            </p>

            {/* Hidden file input — triggered by the button below */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/*"
              multiple
              className="sr-only"
              onChange={handleFileSelect}
            />

            {/* Staged photo thumbnails */}
            {photos.length > 0 && (
              <ul className="space-y-2">
                {photos.map((photo, idx) => (
                  <li
                    key={photo.id}
                    className="flex items-center gap-2 p-2 bg-orange-50 rounded-xl border border-orange-100"
                  >
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={`Page ${idx + 1}`}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />

                    {/* Page label */}
                    <span className="flex-1 text-sm text-gray-600 font-medium">
                      Page {idx + 1}
                    </span>

                    {/* Reorder + remove controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.id, -1)}
                        disabled={idx === 0 || isPhotoWorking}
                        aria-label="Move up"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-100 disabled:opacity-30 transition-colors text-xs font-bold"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.id, 1)}
                        disabled={idx === photos.length - 1 || isPhotoWorking}
                        aria-label="Move down"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-100 disabled:opacity-30 transition-colors text-xs font-bold"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        disabled={isPhotoWorking}
                        aria-label="Remove photo"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors text-sm"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Action buttons */}
            <div className={`flex gap-2 ${photos.length > 0 ? "flex-wrap" : ""}`}>
              {/* Add photos button — shown while slots remain */}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => {
                    if (photoInputRef.current) photoInputRef.current.value = "";
                    photoInputRef.current?.click();
                  }}
                  disabled={isPhotoWorking}
                  className={`${photos.length === 0 ? "w-full" : "flex-1"} px-4 py-2 text-sm font-semibold border-2 border-orange-400 text-orange-600 hover:bg-orange-50 disabled:opacity-50 rounded-lg transition-colors`}
                >
                  {photos.length === 0
                    ? "Choose photos"
                    : `+ Add page (${photos.length}/${MAX_PHOTOS})`}
                </button>
              )}

              {/* Import button — shown when at least one photo is staged */}
              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isPhotoWorking}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  {photoButtonLabel}
                </button>
              )}
            </div>

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

      {/* Add-recipe form (pre-filled on import, blank otherwise).
          key remounts the form whenever a new import lands so controlled
          state (name, ingredients, directions) reinitialises. */}
      <AddRecipeForm
        key={formKey}
        serverAction={createRecipe}
        initialData={initialData}
      />
    </div>
  );
}
