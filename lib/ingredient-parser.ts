import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient } from "./recipe-utils";

// ── Unicode fraction normalization ─────────────────────────────────────────────

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
  "⅙": "1/6", "⅚": "5/6", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
};

function normalizeFractions(s: string): string {
  return s
    .replace(/[½⅓⅔¼¾⅛⅜⅝⅞⅙⅚⅕⅖⅗⅘]/g, (ch) => ` ${UNICODE_FRACTIONS[ch] ?? ""} `)
    .replace(/\s+/g, " ")
    .trim();
}

// ── Unit normalization ─────────────────────────────────────────────────────────
// Maps raw parsed strings (lowercase, dot-stripped) → canonical select values

const UNIT_MAP: Record<string, string> = {
  // Volume
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbs: "tbsp",
  teaspoon: "tsp",  teaspoons: "tsp",  tsp: "tsp",
  cup: "cup", cups: "cup",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", ml: "ml",
  liter: "L",  liters: "L",  litre: "L",  litres: "L",  l: "L",
  // Weight
  ounce: "oz",  ounces: "oz",  oz: "oz",
  pound: "lb",  pounds: "lb",  lb: "lb",  lbs: "lb",
  gram: "g",    grams: "g",   g: "g",
  kilogram: "kg", kilograms: "kg", kg: "kg",
  // Count
  clove: "clove", cloves: "clove",
  pinch: "pinch", pinches: "pinch", dash: "pinch", dashes: "pinch",
  can: "can",   cans: "can",
  slice: "slice", slices: "slice",
  piece: "piece", pieces: "piece",
  head: "head",  heads: "head",
  bunch: "bunch", bunches: "bunch",
  sheet: "sheet", sheets: "sheet",
  // Other
  handful: "handful", handfuls: "handful",
  sprig: "piece",  sprigs: "piece",
  stalk: "piece",  stalks: "piece",
  stick: "piece",  sticks: "piece",
  package: "piece", packages: "piece", pkg: "piece",
};

function normalizeUnit(raw: string): string {
  const key = raw.toLowerCase().replace(/\.+$/, ""); // strip trailing dots
  return UNIT_MAP[key] ?? raw; // unrecognized → keep raw (user can adjust in form)
}

// ── Rule-based parser (Tier 1) ─────────────────────────────────────────────────

// Build unit alternation longest-first so "tablespoons" shadows "tablespoon", etc.
const UNITS_PATTERN = Object.keys(UNIT_MAP)
  .sort((a, b) => b.length - a.length)
  .join("|");

// Optional trailing period + required word boundary (space, comma, end)
const UNIT_RE = new RegExp(`^(${UNITS_PATTERN})(?=\\.?(?:\\s|$|,))`, "i");

// Matches quantities at the start of a string:
// "1 1/2", "1/2", "2-3", "1.5" — but NOT "1 cup" (stops before the unit word)
const QTY_RE =
  /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)/;

function tryRuleBased(line: string): Ingredient | null {
  const normalized = normalizeFractions(line.trim());
  if (!normalized) return null;

  const qtyMatch = normalized.match(QTY_RE);
  if (!qtyMatch) return null; // no leading numeric quantity → ambiguous, defer to LLM

  const amount = qtyMatch[1].trim();
  let rest = normalized.slice(qtyMatch[0].length).trimStart();

  let unit = "";
  const unitMatch = rest.match(UNIT_RE);
  if (unitMatch) {
    unit = normalizeUnit(unitMatch[1]);
    rest = rest.slice(unitMatch[1].length);
    if (rest.startsWith(".")) rest = rest.slice(1); // consume optional trailing period
    rest = rest.trimStart();
    if (/^of\s/i.test(rest)) rest = rest.slice(3).trimStart(); // "1 cup of flour"
  }

  const name = rest.trim();
  if (!name) return null; // bare quantity with no ingredient — ambiguous

  return { amount, unit, name };
}

// ── LLM fallback (Tier 2) ──────────────────────────────────────────────────────

async function tryLLM(lines: string[]): Promise<(Ingredient | null)[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ingredient-parser] ANTHROPIC_API_KEY not set; skipping LLM fallback");
    return lines.map(() => null);
  }

  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
  const prompt = `Parse these recipe ingredient lines into structured fields.

Return a JSON array — one object per line, same order as input.
Each object must have exactly these three string fields:
- "amount": the numeric quantity (e.g. "1", "1/2", "2-3"), or "" if none
- "unit": the measurement unit (e.g. "cup", "tbsp", "oz", "g", "clove"), or "" if none
- "name": the ingredient name plus ALL descriptive text that follows — do NOT strip words like "divided", "finely chopped", "to taste", "plus more for serving", or anything after a comma

Return ONLY the JSON array. No markdown, no explanation.

Lines:
${numbered}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const block = msg.content[0];
    if (block.type !== "text") return lines.map(() => null);

    // Strip accidental markdown code fences
    const text = block.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return lines.map(() => null);

    return (parsed as unknown[]).map((item): Ingredient | null => {
      if (typeof item !== "object" || item === null) return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.name !== "string" || !obj.name.trim()) return null;
      return {
        amount: typeof obj.amount === "string" ? obj.amount.trim() : "",
        unit: normalizeUnit(typeof obj.unit === "string" ? obj.unit.trim() : ""),
        name: obj.name.trim(),
      };
    });
  } catch {
    // Network error, bad JSON, etc. — fall through to last resort
    return lines.map(() => null);
  }
}

// ── Last resort (Tier 3) ───────────────────────────────────────────────────────
// Nothing is ever dropped — store the full original string as the ingredient name.

function lastResort(line: string): Ingredient {
  return { amount: "", unit: "", name: line.trim() };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function parseIngredients(rawLines: string[]): Promise<Ingredient[]> {
  if (rawLines.length === 0) return [];

  // Tier 1: rule-based pass
  const results: (Ingredient | null)[] = rawLines.map(tryRuleBased);

  // Tier 2: batch any unresolved lines to the LLM in a single request
  const ambiguousIdxs = results.reduce<number[]>(
    (acc, r, i) => (r === null ? [...acc, i] : acc),
    []
  );

  if (ambiguousIdxs.length > 0) {
    const llmResults = await tryLLM(ambiguousIdxs.map((i) => rawLines[i]));
    ambiguousIdxs.forEach((origIdx, batchIdx) => {
      results[origIdx] = llmResults[batchIdx];
    });
  }

  // Tier 3: last resort for anything still null after both passes
  return results.map((r, i) => r ?? lastResort(rawLines[i]));
}
