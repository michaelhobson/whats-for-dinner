---
name: add-recipe-field
description: Use whenever adding a new recipe tag or taxonomy value (a cuisine region/style, flavor note, cooking method, season, difficulty level, dish category) or an entirely new field to the Recipe model in the What's For Dinner app. Trigger this even if the request only names one piece of the work (e.g. "add Ethiopian as a cuisine region" or "add it to the form") — partial coverage across the app's touchpoints is exactly the failure mode this skill exists to prevent, and it has caused a real bug before (recipes with an unset tag were silently excluded from the randomizer).
---

# Add a new taxonomy value or recipe field

This app's Definition of Done is explicit: "a tag that only exists in the database but isn't visible/filterable anywhere is not done." A new taxonomy value or field has to land in every one of the places below, not just the one the user happened to mention.

First, figure out which of the two cases this is — they have different scope.

## Case A: a new value in an existing taxonomy

(e.g. adding "Ethiopian" to cuisine regions, a new flavor note, a new cooking method, a new dish category — the field already exists, you're just adding an allowed value.)

1. **Find the canonical list.** Cuisine region/style lives in `lib/cuisine.ts`; Dish Category is a fixed list in `lib/dish-categories.ts`; check whether the other taxonomies (flavor notes, cooking methods, seasons, difficulty) are plain string arrays in application code or Prisma `enum`s in `schema.prisma`. If it's a Prisma enum, adding a value requires a schema change and `npx prisma migrate dev` — follow the database safety rules in CLAUDE.md's Critical rules (local only, confirm before touching production).
2. **Check for a second, hardcoded copy of the list.** Before adding the value in one place, confirm the add-recipe form, edit form, and the shared filter panel all *import* the canonical list rather than keeping their own copy. If any of them hardcode their own options, that's worth flagging and fixing now rather than adding yet another place that can drift out of sync.
3. **Add-recipe form** (`AddRecipeForm` / wherever recipes are created): confirm the new value is selectable.
4. **Edit recipe form:** confirm parity with the add form — a value that's addable but not editable later is a common gap.
5. **Recipe detail view:** confirm the new value displays using the same rendering as existing values in that taxonomy (no missing icon/label case) — `components/RecipeDetailView.tsx` is shared by the recipe detail page and the public share page, so a fix there covers both automatically.
6. **Browse page recipe card:** confirm it shows up there too, if that taxonomy is normally shown on the card.
7. **Shared filter panel (`lib/recipe-filters.ts` + `components/FilterPanel.tsx`):** add the value as a filter option here, not in either page directly — the Randomizer and Cookbook both use this one implementation. Specifically re-test the known failure mode on *both* pages — pick a recipe with this field left null/empty and confirm it still appears in *unfiltered* results and isn't silently dropped by the filtered view. Confirm the filter's count display updates correctly too.
8. **Seed data (`prisma/seed.ts`):** not required, but decide deliberately whether any seed recipes should use the new value rather than leaving it to chance.

## Case B: an entirely new field on the Recipe model

Everything in Case A, plus:

1. **`schema.prisma`:** add the column. Decide nullable-with-default vs. required, and whether a migration script (like `migrate-kitchen.ts`) is needed to backfill existing recipes.
2. **`lib/recipe-utils.ts`:** add the field to the `ParsedRecipe` type so every import path can produce it.
3. **All three import paths** (`import.ts`, `import-photo.ts`, `import-url.ts`): update each so it either populates the new field or explicitly leaves it unset — don't let one path silently diverge from the others (see CLAUDE.md's note on keeping import paths aligned on `ParsedRecipe`).
4. **`/api/export` and the settings JSON restore path:** confirm the backup/restore round-trip includes the new field — a field that exports but doesn't restore (or vice versa) will look fine until someone actually restores a backup.

## Before calling it done

Click through it manually in the browser per CLAUDE.md's Definition of done — don't just read the code:
- The new value/field is visible and correct on browse cards, detail view, add form, edit form, and the shared filter panel (check both the Randomizer and the Cookbook).
- A recipe that doesn't have this field/value set behaves correctly everywhere (no silent exclusion, no crash).
- No console errors.
- Prior phases (recipe list, form, randomizer) still work.