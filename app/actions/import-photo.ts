"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient } from "@/lib/recipe-utils";
import { normalizeUnit } from "@/lib/ingredient-parser";

export type ImportedPhotoData = {
  name: string;
  ingredients: Ingredient[];
  directions: string[];
  prepTime: number | null;
};

export type ImportPhotoState =
  | { ok: true; recipe: ImportedPhotoData }
  | { ok: false; error: string }
  | null;

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

function normalizeType(raw: string): SupportedType | null {
  const t = raw.toLowerCase().replace("image/jpg", "image/jpeg");
  return (SUPPORTED_TYPES as readonly string[]).includes(t) ? (t as SupportedType) : null;
}

// Prompt adapts based on how many pages were submitted.
// When images are blurry on some pages the model is instructed to still
// extract what it can, so the error only fires when ALL pages fail.
function buildPrompt(imageCount: number): string {
  const multi = imageCount > 1;
  return `Extract the complete recipe from the following ${imageCount} image${multi ? "s" : ""}${multi ? ", which show sequential pages of a single recipe" : ""}.

${
  multi
    ? `Combine information from all pages into one result:
- Merge ingredients across all pages into a single list; omit exact duplicates
- Combine directions in page order
- If a page is blurry or unreadable, extract what you can from the remaining pages
- Only set "found": false when no usable recipe data could be extracted from any image

`
    : ""
}Return ONLY this JSON object, no markdown, no explanation:
{
  "found": true,
  "name": "recipe name",
  "prepTime": 30,
  "ingredients": [
    { "amount": "1", "unit": "cup", "name": "ingredient plus any descriptors" }
  ],
  "directions": ["Step 1 text", "Step 2 text"]
}

If no usable recipe data can be extracted${multi ? " from any of the images" : ""}, return exactly: {"found":false}

Field rules:
- "prepTime": total time in minutes (combine prep + cook if listed separately), or null if not visible
- "amount": numeric quantity as a string ("1", "1/2", "2-3"), or "" if absent
- "unit": measurement unit (cup, tbsp, tsp, oz, lb, g, clove, pinch, etc.), or "" if absent
- "name": ingredient name plus ALL descriptive text — keep "finely chopped", "to taste", "divided", etc.
- "directions": each step as a separate plain-text string`;
}

export async function importFromPhoto(
  _prev: ImportPhotoState,
  formData: FormData
): Promise<ImportPhotoState> {
  const files = formData.getAll("image") as File[];

  if (files.length === 0 || files.every((f) => f.size === 0)) {
    return { ok: false, error: "No images selected." };
  }
  if (files.length > 5) {
    return { ok: false, error: "Please select at most 5 photos." };
  }

  // Validate each file
  const imageEntries: { mediaType: SupportedType; data: string }[] = [];
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      return { ok: false, error: "One or more images exceeded 10 MB after compression." };
    }
    const mediaType = normalizeType(file.type);
    if (!mediaType) {
      return { ok: false, error: "All images must be JPEG, PNG, GIF, or WebP." };
    }
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    imageEntries.push({ mediaType, data });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  // Build a single message with one image block per page, then the text prompt.
  // The model processes them in the order provided.
  const content: Anthropic.MessageParam["content"] = [
    ...imageEntries.map(
      ({ mediaType, data }): Anthropic.ImageBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: mediaType, data },
      })
    ),
    { type: "text", text: buildPrompt(imageEntries.length) },
  ];

  let parsed: unknown;
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    const block = msg.content[0];
    if (block.type !== "text") {
      return { ok: false, error: "Unexpected response from model — please try again." };
    }

    const text = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Something went wrong processing the images — please try again." };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !(parsed as Record<string, unknown>).found
  ) {
    return {
      ok: false,
      error:
        "Couldn't find a recipe in those photos — try clearer images, or enter the recipe manually.",
    };
  }

  const data = parsed as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    return {
      ok: false,
      error:
        "Couldn't find a recipe in those photos — try clearer images, or enter the recipe manually.",
    };
  }

  const prepTime =
    typeof data.prepTime === "number" && data.prepTime > 0
      ? Math.round(data.prepTime)
      : null;

  return {
    ok: true,
    recipe: {
      name,
      ingredients: extractIngredients(data.ingredients),
      directions: extractDirections(data.directions),
      prepTime,
    },
  };
}

function extractIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).reduce<Ingredient[]>((acc, item) => {
    if (typeof item !== "object" || item === null) return acc;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) return acc;
    acc.push({
      amount: typeof obj.amount === "string" ? obj.amount.trim() : "",
      unit: normalizeUnit(typeof obj.unit === "string" ? obj.unit.trim() : ""),
      name,
    });
    return acc;
  }, []);
}

function extractDirections(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
