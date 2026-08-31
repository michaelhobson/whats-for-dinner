@AGENTS.md
## 1. Project Overview

"What's For Dinner?" is a personal recipe database and randomizer, originally built for the developer and his girlfriend, that helps decide what to make for dinner by picking from (and filtering) a curated list of recipes they've cooked or want to try. The app now supports multiple accounts, each with their own "Kitchen" (a private recipe collection that can grow into a shared household with multiple members and permission levels). It's a small, personal-scale product for a household and a circle of friends — not built for public/anonymous signup at this time.

## 2. Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database ORM:** Prisma
- **Database:** PostgreSQL (hosted on Vercel Postgres in production; a local Postgres instance for development — not SQLite)
- **Hosting:** Vercel
- **Auth:** Auth.js (NextAuth v5), email magic-link login via Resend
- **AI features:** Anthropic API (`claude-haiku-4-5-20251001`) — used for photo-based recipe import and as a fallback for ingredient-line parsing that rule-based logic can't confidently handle
- **Package manager:** whatever `create-next-app` set up by default (npm unless told otherwise)

## 3. Architecture & Directory Structure

Standard Next.js App Router conventions apply.

```
/app
  /actions          — server actions: recipes.ts, import.ts, import-photo.ts, import-url.ts
  /api/auth         — Auth.js route handler ([...nextauth]/route.ts)
  /api/export       — GET: download kitchen recipes as JSON backup
  /login            — magic-link sign-in form + /check-email confirmation page
  /randomize        — randomizer page (server) + RandomizerClient (client filters + draw)
  /recipes          — browse page; /[id] detail + edit; /new add-recipe + import form
  /settings         — backup (export) and restore (JSON import)
  page.tsx          — homepage
/components         — NavBar, RecipeCard, AddRecipeForm, and other shared UI
/lib
  prisma.ts         — Prisma client singleton (PrismaPg adapter)
  kitchen.ts        — getKitchenId() for writes; getKitchenIds() for reads
  recipe-utils.ts   — ParsedRecipe type, parseRecipe(), display helpers
  cuisine.ts        — region/style lists, CuisinePairing type
  ingredient-parser.ts — ingredient line parsing and unit normalization
/prisma
  schema.prisma     — full data model (Auth.js models, Kitchen, KitchenMembership, Recipe, CookLog)
  seed.ts           — sample data for local development
  migrate-kitchen.ts — one-time script to backfill kitchenId on existing recipes
/types
  next-auth.d.ts    — extends Session to include user.id

auth.config.ts      — Edge-compatible Auth.js config (no Prisma); imported by proxy
auth.ts             — full Auth.js config: Prisma adapter, Resend, JWT sessions
proxy.ts            — session-based route protection (all routes except /login, /api/auth); renamed from middleware.ts per Next.js 16 convention
prisma.config.ts    — Prisma 7 config: schema path, DATABASE_URL (not inside /prisma/)
```

Keep data-fetching logic in server components or route handlers where possible rather than client-side fetches, per standard Next.js App Router practice.

## 4. Core Commands

- `npm run dev` — start the local dev server
- `npx prisma migrate dev` — apply schema changes to the local database
- `npx prisma studio` — open a GUI to inspect/edit the database directly (useful for debugging without writing queries)
- `npx tsx prisma/seed.ts` (or equivalent) — re-run the seed script
- `git add . && git commit -m "..."` — commit a working checkpoint after each completed phase

## 5. Database Safety

Never run a script or command that deletes, truncates, or resets data (deleteMany, migrate reset, db push --force-reset, etc.) against the production database. Any destructive database operation must default to the LOCAL database only, and must require explicit confirmation before running against production. When in doubt about which database a command will affect, ask before running it.

## 6. Code & Design Conventions

- **TypeScript throughout** — no plain `.js` files for app code.
- **Component style:** functional components with hooks; no class components.
- **Styling:** Tailwind utility classes; avoid introducing a second styling system (no CSS modules, styled-components, etc.) unless there's a strong reason.
- **Visual tone:** warm, appetizing, a little playful — this is a fun household tool, not enterprise software. Some visual flourish (icons, color, animation on the randomizer) is welcome and encouraged, not something to strip out for minimalism's sake.
- **Mobile-friendly:** layouts should work on a phone-sized screen as well as a laptop browser.
- **Dependencies:** prefer what's already installed; only add a new package when it clearly earns its place, and mention what was added and why.
- **Comments:** not required for every function, but leave a short comment anywhere the logic is non-obvious.
- **Secrets:** never paste API keys, connection strings, or other secrets into a prompt as literal text — reference that they're already set in `.env` / Vercel and let the code read them from the environment.
- **AI-powered features:** prefer deterministic, rule-based logic first; only fall back to an Anthropic API call for cases that logic can't confidently handle (this is how ingredient-line parsing works, and should be the default pattern for future AI-assisted features too). When an API call is needed for multiple items in one operation (e.g. several ambiguous ingredient lines, several photos of one recipe), batch them into a single request rather than issuing one call per item.

## 7. Definitions of Done

A feature/phase is done when:

- It works when clicked through manually in the browser (not just "the code looks right") — assume the person reviewing is checking behavior, not code.
- There are no console errors in the browser dev tools during normal use of the new feature.
- Existing features from prior phases still work (don't regress the recipe list, form, or randomizer while building a new piece).
- The dev server starts cleanly with `npm run dev` and the relevant page loads without a crash.
- New fields/tags added to the data model are reflected everywhere they should appear (browse cards, detail view, add-recipe form, randomizer filters) — a tag that only exists in the database but isn't visible/filterable anywhere is not done.
- Any mutation (create, update, delete) triggers the necessary cache revalidation so the change is reflected immediately everywhere it should appear (browse page, randomizer, etc.), without requiring an unrelated action elsewhere in the app to trigger a refresh.
- Failures are never silent — a failed save or action always surfaces a clear, visible error message to the user.

## 8. Kitchen Permission Levels

Roles are scoped per KitchenMembership (a user can hold different roles in different kitchens — never treat role as a global per-user property).

- **RESTAURATEUR**: Full permissions. Can change all kitchen settings (add/remove members, set member roles), and can add/edit/delete recipes (including via import), rate, write notes, and log cook history. Assume Restaurateur can do anything that's possible within a kitchen.
- **CHEF**: Can add/edit/delete recipes (including via import), rate recipes, write notes, and log cook history. Can view kitchen settings and membership but cannot change them.
- **DINER**: Read-only on recipes and settings/membership. Can still rate, write notes, and log cook history on recipes — these are considered low-risk personal-use actions, not content changes.

All members of a kitchen, regardless of role, can view all recipes and use the randomizer/dinner-selection features.

**Invariant: a kitchen must always have at least one Restaurateur.** Block the last remaining Restaurateur from demoting themselves or leaving/being removed from the kitchen. They must promote another member to Restaurateur first.

**Ratings, notes, and cook history are currently shared per recipe** (one value per recipe, visible and editable by any member with permission to do so — last write wins). This is intentional for now, not an oversight (see Future Roadmap below).

## 9. Current Status

*Update this section as phases are completed, so future sessions know where things stand.*

- [x] Phases 1.1–6 — Project setup, basic features, and initial polish
- [x] Phase 2.1 — Foundation (edit/delete, directions, cook history, ratings)
- [x] Phase 2.2 — Push to web
- [x] Phase 2.3 — Import (URL, photo, multi-photo, structured ingredient parsing)
- [x] Phase 2.4a — Accounts: auth + Kitchen data model + migration of existing recipes
- [x] Phase 2.4b — Accounts: scope all reads/writes to the current user's kitchen
- [ ] Phase 2.4c — Kitchen invites and permission-level enforcement (Restaurateur/Chef/Diner)
- [ ] Phase 2.5 — Share features
- [ ] Phase 2.6 — Planning tools (full week mode, shopping list)
- [ ] Phase 2.7 — Dinner party mode

## 10. Future Roadmap & Non-Goals

### Planned (with architecture notes to keep in mind now)

**Accounts model:** Recipes, ratings, notes, and cook history belong to a "Kitchen," not directly to a User. A KitchenMembership join table links Users to Kitchens with a role (Restaurateur/Chef/Diner). Every user gets one personal Kitchen by default; a Kitchen can have multiple members, and a User can belong to multiple Kitchens. Do not simplify this back to a direct User-owns-Recipe relationship.

**Recipe provenance:** Recipe has nullable `sourceUrl` and `forkedFromRecipeId` fields, unused until cross-kitchen recipe sharing is built. Keep these fields when touching the Recipe model.

**Global recipe pool:** Will be implemented as a regular Kitchen (not a separate system), likely flagged with an `isGlobalPool` boolean or well-known ID. "Trusted" push access = CHEF-or-above membership in that Kitchen, granted the same way any kitchen membership is granted. "Pulling" a recipe into your own kitchen creates a new Recipe row with `forkedFromRecipeId` set to the original — an explicit copy, not a live sync. Reuse Kitchen/KitchenMembership entirely; don't build a parallel permissions system.

**Per-person recipe feedback:** Ratings, notes, and cook history will eventually become per-kitchen-member rather than a single shared value per recipe — e.g. each member's own thumbs up/down aggregating into a kitchen-wide net rating, a shared cook-history log showing who cooked what and when, and notes behaving more like a comment thread (multiple entries, attributed) rather than one shared text field. Not being built yet.

**Dinner party mode:** Will need new recipe categories (side dishes, appetizers, beverages) in addition to the existing meal types — a schema decision to make when this phase starts, not before.

**Planning tools (shopping list):** The structured quantity/unit/ingredient format already built for recipe import means the data needed to aggregate a shopping list already exists — no additional ingredient-schema work should be needed when this phase starts.

### Deferred / not currently planned

- **Public APIs** (add recipe, randomize, dinner party, full week) — only build if a concrete need arises (e.g. personal automation like a voice-assistant shortcut); not being built speculatively.
- **Video ingestion** from Instagram/TikTok/YouTube (downloading and transcribing video) — flagged early on as high-complexity and fragile (platform ToS and technical reliability both work against it). If revisited, start with something much smaller, like parsing a pasted caption/description rather than the video itself.
