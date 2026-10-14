# Architecture Notes

How the larger built features work, and why. Read the relevant section before changing the Global Pool, sharing, or the recipe card image. Phase status and planned work live in `docs/ROADMAP.md`; roles and permissions live in `docs/PERMISSIONS.md`.

## Accounts model

Recipes, ratings, notes, and cook history belong to a Kitchen, not directly to a User. A KitchenMembership join table links Users to Kitchens with a role. Every user gets one personal Kitchen by default; a Kitchen can have multiple members, and a User can belong to multiple Kitchens. Do not simplify this back to a direct User-owns-Recipe relationship.

## Global recipe pool

A regular Kitchen flagged `isGlobalPool: true` (exactly one such row; resolved via `lib/global-pool.ts`'s `getGlobalPoolKitchenId()`). Push access (add/edit/delete pool recipes) is plain CHEF-or-above membership in that Kitchen, the same role check as any other kitchen, with no parallel permission system.

"Pulling" calls the one shared `pullRecipeToKitchen()`:
- Copies content fields only. Ratings, notes, cook history, and favorite are NOT copied; those stay kitchen-specific and start fresh.
- Sets `forkedFromRecipeId` to the original.
- Is idempotent: a second pull of the same original into the same kitchen returns the existing fork, and pulling into the original's own kitchen is blocked outright.

New kitchens (via `createKitchen()` and the first-login personal-kitchen path, never retroactively) are auto-seeded with the full pool through this same function.

The "Hide starter recipes" toggle (Cookbook/Randomizer) excludes only recipes forked from a recipe actually in the pool kitchen, not forks of any other kitchen's recipes.

## Recipe sharing via unlisted links

`Recipe.shareToken` (unique) + `shareRevokedAt`, with at most one active link per recipe.
- Generating reuses an existing active token rather than minting a new one.
- Revoking sets `shareRevokedAt`. The next generate always mints a fresh token; an old token can never reactivate.
- `/share/[token]` is public (excluded from `proxy.ts`'s auth gate), force-dynamic (live recipe state, never a snapshot), and noindex.
- A non-member viewing a recipe there (or via the Global Pool) only ever sees read-only content. Rating, notes, and cook history require actual kitchen membership.
- Pulling from a share link reuses the exact same `pullRecipeToKitchen()` as the Global Pool, including the same guards.

## Shareable recipe card image

Generated client-side (`html-to-image` + `qrcode`), not server-rendered, as a fixed 1080×1350 PNG.
- Three *discrete* density tiers (Generous/Standard/Minimal), chosen by ingredient count plus a capped step count, not continuous font scaling. Generous fills space with spacing, not bigger text.
- Truncation is decided from real measured DOM heights (an off-screen "measurer" pass using the same shared sub-components as the final card), not a character-count estimate. The estimate approach was tried first and produced visible overlap and overflow.
- The embedded QR logo mark is centered from the canvas's actual final pixel dimensions and `ctx.measureText()`'s real bounding box, not the nominal requested size. Neither is reliably consistent across devices.
