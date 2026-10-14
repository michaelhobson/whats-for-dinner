# Roadmap & Phase Status

Read this before starting a new phase or making schema decisions for a planned feature. Update the status checklist when a phase completes. How already-built features work is in `docs/ARCHITECTURE.md`.

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

## Planned, with architecture notes to keep in mind now

**Per-person recipe feedback.** Ratings, notes, and cook history will eventually become per-kitchen-member instead of one shared value per recipe: each member's own thumbs up/down aggregating into a kitchen-wide net rating, a shared cook-history log showing who cooked what and when, and notes behaving like an attributed comment thread. Not being built yet.

**Fork freshness check.** Automatically checking whether a forked recipe's original has since been updated, and surfacing that to the kitchen that pulled it, is not built. `forkedFromRecipeId` currently only records lineage at pull time, with no diffing or "update available" signal.

**Dinner party mode.** Needs new recipe categories (side dishes, appetizers, beverages) beyond the existing meal types. This is a schema decision to make when the phase starts, not before.

**Planning tools (shopping list).** The structured quantity/unit/ingredient format built for recipe import already holds the data needed to aggregate a shopping list. No additional ingredient-schema work should be needed.

## Deferred / not currently planned

- **Public APIs** (add recipe, randomize, dinner party, full week). Only build if a concrete need arises, such as personal automation like a voice-assistant shortcut. Not to be built speculatively.
- **Video ingestion** from Instagram/TikTok/YouTube (downloading and transcribing). High-complexity and fragile, since platform ToS and technical reliability both work against it. If revisited, start much smaller, such as parsing a pasted caption or description.
- **Third recipe import path** (URL scrape and photo vision exist). Under consideration but not built. Once one exists, check that all import paths still converge on `ParsedRecipe`.
