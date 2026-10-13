# Roadmap & Phase Status

Read this before starting a new phase or making schema decisions for a planned feature. Update the status checklist when a phase completes.

## Status

- [x] Phases 1.1–6 — Project setup, basic features, and initial polish
- [x] Phase 2.1 — Foundation (edit/delete, directions, cook history, ratings)
- [x] Phase 2.2 — Push to web
- [x] Phase 2.3 — Import (URL, photo, multi-photo, structured ingredient parsing)
- [x] Phase 2.4a — Accounts: auth + Kitchen data model + migration of existing recipes
- [x] Phase 2.4b — Accounts: scope all reads/writes to the current user's kitchen
- [x] Phase 2.4c — Kitchen invites (send, accept, revoke)
- [x] Phase 2.4d — Kitchen permission enforcement: Restaurateur/Chef/Diner checked server-side on every recipe and kitchen-settings action, not just hidden in the UI; last-Restaurateur invariant enforced on demote/remove/leave
- [x] Phase 2.4e — Nav & Settings restructure, Cookbook rename, ingredient reordering, Edit Recipe cancel/save placement
- [x] Phase 2.4f — Randomizer & Cookbook filter overhaul: shared accordion filter panel, count-based option display, fixed Dish Category list, Cookbook search
- [x] Phase 2.5a — Global Recipe Pool: dedicated Kitchen, Chef-or-above push access, pull/fork mechanic, auto-seeding, "Hide starter recipes" toggle
- [x] Phase 2.5b — Recipe sharing: unlisted share links, public share page, "Pull to my kitchen" from a link, shareable recipe card image with embedded QR code
- [ ] Phase 2.6 — Planning tools (full week mode, shopping list)
- [ ] Phase 2.7 — Dinner party mode

## Already built — architecture notes to keep in mind

**Accounts model.** Recipes, ratings, notes, and cook history belong to a Kitchen, not directly to a User. A KitchenMembership join table links Users to Kitchens with a role. Every user gets one personal Kitchen by default; a Kitchen can have multiple members, and a User can belong to multiple Kitchens. Do not simplify this back to a direct User-owns-Recipe relationship.

**Global recipe pool.** A regular Kitchen flagged `isGlobalPool: true` (exactly one such row; resolved via `lib/global-pool.ts`'s `getGlobalPoolKitchenId()`). Push access (add/edit/delete pool recipes) is plain CHEF-or-above membership in that Kitchen — the same role check as any other kitchen, no parallel permission system. "Pulling" calls the one shared `pullRecipeToKitchen()`: copies content fields only (ratings/notes/cook-history/favorite are NOT copied — those stay kitchen-specific and start fresh), sets `forkedFromRecipeId` to the original, and is idempotent (a second pull of the same original into the same kitchen returns the existing fork; pulling into the original's own kitchen is blocked outright). New kitchens — via `createKitchen()` and the first-login personal-kitchen path, never retroactively — are auto-seeded with the full pool through this same function. The "Hide starter recipes" toggle (Cookbook/Randomizer) excludes only recipes forked from a recipe actually in the pool kitchen, not forks of any other kitchen's recipes.

**Recipe sharing via unlisted links.** `Recipe.shareToken` (unique) + `shareRevokedAt` — at most one active link per recipe. Generating reuses an existing active token rather than minting a new one; revoking sets `shareRevokedAt`, and the next generate always mints a fresh token (the old one can never reactivate). `/share/[token]` is public (excluded from `proxy.ts`'s auth gate), force-dynamic (live recipe state, never a snapshot), and noindex. A non-member viewing a recipe there (or via the Global Pool) only ever sees read-only content — rating/notes/cook-history require actual kitchen membership. Pulling from a share link reuses the exact same `pullRecipeToKitchen()` as the Global Pool, including the same guards.

**Shareable recipe card image.** Generated client-side (`html-to-image` + `qrcode`), not server-rendered, as a fixed 1080×1350 PNG. Three *discrete* density tiers (Generous/Standard/Minimal, chosen by ingredient + capped step count), not continuous font scaling — Generous fills space via spacing, not bigger text. Truncation is decided from real measured DOM heights (an off-screen "measurer" pass using the same shared sub-components as the final card), not a character-count estimate — the estimate approach was tried first and produced visible overlap/overflow. The embedded QR logo mark is centered from the canvas's actual final pixel dimensions and `ctx.measureText()`'s real bounding box, not the nominal requested size — neither is reliably consistent across devices.

## Planned, with architecture notes to keep in mind now

**Per-person recipe feedback.** Ratings, notes, and cook history will eventually become per-kitchen-member instead of one shared value per recipe: each member's own thumbs up/down aggregating into a kitchen-wide net rating, a shared cook-history log showing who cooked what and when, and notes behaving like an attributed comment thread. Not being built yet.

**Fork freshness check.** Automatically checking whether a forked recipe's original has since been updated, and surfacing that to the kitchen that pulled it, is not built. `forkedFromRecipeId` currently only records lineage at pull time — no diffing or "update available" signal.

**Dinner party mode.** Needs new recipe categories (side dishes, appetizers, beverages) beyond the existing meal types. This is a schema decision to make when the phase starts, not before.

**Planning tools (shopping list).** The structured quantity/unit/ingredient format built for recipe import already holds the data needed to aggregate a shopping list. No additional ingredient-schema work should be needed.

## Deferred / not currently planned

- **Public APIs** (add recipe, randomize, dinner party, full week). Only build if a concrete need arises, such as personal automation like a voice-assistant shortcut. Not to be built speculatively.
- **Video ingestion** from Instagram/TikTok/YouTube (downloading and transcribing). High-complexity and fragile, since platform ToS and technical reliability both work against it. If revisited, start much smaller, such as parsing a pasted caption or description.
- **Third recipe import path** (URL scrape and photo vision exist). Under consideration but not built. Once one exists, check that all import paths still converge on `ParsedRecipe`.