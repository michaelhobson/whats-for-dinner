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

const EXTRACTION_PROMPT = `Extract the recipe from this image as structured JSON.

Return ONLY this JSON object, no markdown, no explanation:
{
  "found": true,
  "name": "recipe name",
  "prepTime": 30,
  "ingredients": [
    { "amount": "1", "unit": "cup", "name": "ingredient plus any descriptors" }
  ],
  "directions": ["Step 1 text", "Step 2 text"]
}

If you cannot confidently identify a complete recipe in the image, return exactly: {"found":false}

Rules:
- "prepTime": total time in minutes (combine prep + cook if both shown), or null if not visible
- "ingredients.amount": quantity as a string ("1", "1/2", "2-3"), or "" if not shown
- "ingredients.unit": measurement unit ("cup", "tbsp", "tsp", "oz", "lb", "g", "clove", "pinch", etc.), or "" if not shown
- "ingredients.name": ingredient name plus ALL descriptive text — keep "divided", "finely chopped", "to taste", etc.
- "directions": each step as a plain-text string`;

export async function importFromPhoto(
  _prev: ImportPhotoState,
  formData: FormData
): Promise<ImportPhotoState> {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No image selected." };

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Image too large — please use an image under 10 MB." };
  }

  // Normalize image/jpg → image/jpeg (some devices report the shorter form)
  const rawType = file.type.toLowerCase().replace("image/jpg", "image/jpeg");
  if (!(SUPPORTED_TYPES as readonly string[]).includes(rawType)) {
    return { ok: false, error: "Please upload a JPEG, PNG, GIF, or WebP image." };
  }
  const mediaType = rawType as SupportedType;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  let parsed: unknown;
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
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
    return { ok: false, error: "Something went wrong processing the image — please try again." };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !(parsed as Record<string, unknown>).found
  ) {
    return {
      ok: false,
      error:
        "Couldn't find a recipe in that image — try a clearer photo, or enter the recipe manually.",
    };
  }

  const data = parsed as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    return {
      ok: false,
      error:
        "Couldn't find a recipe in that image — try a clearer photo, or enter the recipe manually.",
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
