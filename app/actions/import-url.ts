"use server";

import { parseIngredients } from "@/lib/ingredient-parser";
import type { Ingredient } from "@/lib/recipe-utils";

export type ImportedRecipeData = {
  name: string;
  ingredients: Ingredient[];
  directions: string[];
  prepTime: number | null;
  sourceUrl: string;
};

export type ImportUrlState =
  | { ok: true; recipe: ImportedRecipeData }
  | { ok: false; error: string }
  | null;

export async function importFromUrl(
  _prev: ImportUrlState,
  formData: FormData
): Promise<ImportUrlState> {
  const rawUrl = ((formData.get("url") as string) ?? "").trim();

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Please enter a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Only http and https URLs are supported." };
  }

  let html: string;
  try {
    const res = await fetch(rawUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WhatsForDinner-importer/1.0; +https://github.com/michaelhobson/whats-for-dinner)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Couldn't fetch that page (HTTP ${res.status}). Check the URL and try again.`,
      };
    }
    html = await res.text();
  } catch {
    return {
      ok: false,
      error: "Couldn't reach that page. Check the URL and try again.",
    };
  }

  // Collect all JSON-LD script blocks from the page
  const jsonLdRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = jsonLdRegex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      // skip malformed blocks
    }
  }

  // Search for a schema.org Recipe object
  let recipeData: Record<string, unknown> | null = null;
  for (const block of blocks) {
    recipeData = findRecipe(block);
    if (recipeData) break;
  }

  if (!recipeData) {
    return {
      ok: false,
      error:
        "Couldn't find recipe data on that page — try entering it manually.",
    };
  }

  const name =
    typeof recipeData.name === "string" ? recipeData.name.trim() : "";
  if (!name) {
    return {
      ok: false,
      error:
        "Couldn't find recipe data on that page — try entering it manually.",
    };
  }

  const rawIngredients = extractIngredientStrings(recipeData.recipeIngredient);
  const ingredients = await parseIngredients(rawIngredients);

  return {
    ok: true,
    recipe: {
      name,
      ingredients,
      directions: extractDirections(recipeData.recipeInstructions),
      prepTime: extractPrepTime(recipeData),
      sourceUrl: rawUrl,
    },
  };
}

// ── JSON-LD helpers ────────────────────────────────────────────────────────────

function findRecipe(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
    return obj;
  }

  // @graph array (common on food sites)
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"] as unknown[]) {
      const found = findRecipe(item);
      if (found) return found;
    }
  }

  // WebPage > mainEntity pattern
  if (obj.mainEntity) {
    const found = findRecipe(obj.mainEntity);
    if (found) return found;
  }

  return null;
}

// Returns raw ingredient strings from the JSON-LD data for the parser to process
function extractIngredientStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function extractDirections(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const steps: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      steps.push(item.trim());
    } else if (typeof item === "object" && item !== null) {
      const obj = item as Record<string, unknown>;
      if (typeof obj.text === "string") {
        // HowToStep
        steps.push(obj.text.trim());
      } else if (Array.isArray(obj.itemListElement)) {
        // HowToSection containing nested steps
        for (const sub of obj.itemListElement as unknown[]) {
          if (typeof sub === "object" && sub !== null) {
            const subText = (sub as Record<string, unknown>).text;
            if (typeof subText === "string") steps.push(subText.trim());
          }
        }
      }
    }
  }
  return steps.filter((s) => s.length > 0);
}

function extractPrepTime(recipe: Record<string, unknown>): number | null {
  // Prefer prepTime; fall back to totalTime
  const duration = recipe.prepTime ?? recipe.totalTime;
  if (typeof duration !== "string") return null;
  return parseIso8601Duration(duration);
}

function parseIso8601Duration(s: string): number | null {
  // Handles PT30M, PT1H30M, P0DT1H30M, etc.
  const match = s.match(/PT?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return null;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}
