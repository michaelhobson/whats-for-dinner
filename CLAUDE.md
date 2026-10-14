@AGENTS.md

# What's For Dinner?

A recipe database and randomizer for a household and a small circle of friends (deployed at menuroulette.app). Each account has a "Kitchen": a recipe collection that can be shared by multiple members with different permission levels. Not built for public/anonymous signup.

## Working with the developer

- The developer is a beginner who reviews results in the browser, not in code. After each change, explain what changed in plain language and say where to click to verify it.
- Before building anything with UX or architectural implications, surface the edge cases and ask. Don't decide them silently.
- Build only the current task or phase. `docs/ROADMAP.md` is context, not a to-do list. Don't build ahead of it.
- When work meets the Definition of Done, propose a commit. Don't commit unprompted.

## Stack

- Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4
- Prisma 7 with the PrismaPg adapter; PostgreSQL (local Postgres in dev, hosted Postgres on Vercel in production)
- Auth.js v5 (NextAuth beta): email magic-link login via Resend, JWT sessions
- Anthropic SDK with Claude Haiku for photo recipe import and ingredient-line fallback parsing. Keep the model ID in one place in the code; never hardcode a second copy.
- `qrcode` + `html-to-image` generate the shareable recipe card image, client-side (see `docs/ARCHITECTURE.md` before touching it)
- npm (`package-lock.json`)

## Commands

- `npm run dev` — local dev server
- `npm run build` — runs `prisma generate && next build`
- `npx tsc --noEmit` — typecheck (there is no lint or test script)
- `npx prisma migrate dev` — apply schema changes to the LOCAL database
- `npx prisma studio` — inspect the database
- `npx tsx prisma/seed.ts` — seed sample data (see Database Safety before running)

Before saying work is done, run the typecheck and `npm run build` and fix any errors.

## Non-obvious architecture

- **Kitchen scoping (`lib/kitchen.ts`):** `getKitchenId()` / `getKitchenIds()` resolve the active kitchen. `getAllKitchenIds()` returns every kitchen the caller belongs to, for ownership checks on a recipe looked up by ID. `getReadableKitchenIds()` adds the one deliberate read exception: Global Pool recipes are readable by anyone. `getKitchenRole()` does the per-kitchen membership lookup.
- **Role checks:** `lib/permissions.ts` has `canEditRecipes` (Chef-or-above) and `canManageKitchen` (Restaurateur-only), pure functions over a role string. Every server action calls both the membership lookup and the matching check. See Critical rules.
- **Auth split:** `auth.config.ts` is Edge-safe and must never import Prisma. `auth.ts` is the full config; on first login it also creates a personal Kitchen and seeds it from the Global Pool. Route protection lives in `proxy.ts`, which also leaves `/invite` and `/share` public. Use `proxy.ts`, not `middleware.ts`.
- **Prisma config:** `prisma.config.ts` is at the repo root, not in `/prisma`, and reads `DATABASE_URL`.
- **Import paths:** URL, photo, and paste imports all converge on the `ParsedRecipe` shape in `lib/recipe-utils.ts`. Keep them aligned.
- **Server actions** live in `app/actions/`. Prefer server components and route handlers over client-side fetching.
- **One fork mechanic:** `pullRecipeToKitchen()` in `lib/global-pool.ts` is the only way a recipe is copied between kitchens (Global Pool pull, share-link pull, kitchen auto-seeding). Extend it; never add a second copy path.
- **Visibility exceptions:** the Global Pool and `/share/[token]` links are the only two exceptions to "a kitchen's recipes are visible only to its members." Both are read-only; rating, notes, and cook history still require real membership. Details in `docs/ARCHITECTURE.md`.
- **Shared filter UI:** `lib/recipe-filters.ts` + `components/FilterPanel.tsx` implement filtering once for both the Randomizer and the Cookbook. Add a new filter there, not in either page.

## Critical rules

**IMPORTANT: Tenancy.** Never fetch or modify a recipe by ID alone.
- Writes target the active kitchen via `getKitchenId()`. Reads use `getKitchenIds()`, or `getReadableKitchenIds()` only where Global Pool visibility is intended.
- When an action receives a recipe or kitchen ID, confirm the caller belongs to that recipe's kitchen (`getAllKitchenIds()` / `getKitchenRole()`) and check their role in that kitchen, not just the active one.
- Enforce roles in the server action itself. Hiding or disabling a button is a UX nicety, never the enforcement; the action must reject a direct call too.
- Role belongs to a KitchenMembership, never to a User globally. A kitchen must always keep at least one Restaurateur.
- Read `docs/PERMISSIONS.md` before touching membership, invites, or role checks.

**IMPORTANT: Database safety.**
- Never run anything that deletes, truncates, or resets data (`deleteMany`, `migrate reset`, `db push --force-reset`, `seed.ts --force`) against production.
- Before any migrate, seed, or destructive script, check that `DATABASE_URL` points at the local database. If you can't tell, stop and ask.
- Destructive operations default to local only and need explicit confirmation for anything else.

**IMPORTANT: Secrets.** Never put API keys, connection strings, or other secrets into prompts, code, or commits. Reference variables from `.env` / Vercel and read them from the environment.

## Conventions

- TypeScript throughout; functional components with hooks; Tailwind only (no CSS modules or styled-components).
- Visual tone: warm, appetizing, a little playful. Flourish (icons, color, randomizer animation) is encouraged.
- Mobile-first layouts that also work on a laptop.
- Prefer installed dependencies. When adding a package, say what and why.
- Comment only where logic is non-obvious.
- **AI features:** try deterministic, rule-based logic first and call the Anthropic API only for cases it can't handle confidently. When several items need the API in one operation, batch them into a single request.
- **Reuse over parallel implementations:** when a new feature resembles something that exists, extend the existing function or component (with a parameter if needed) rather than forking it. Examples: `pullRecipeToKitchen()` above; the share popover, kitchen switcher, and overflow menu all use the same outside-click/Escape popover pattern.

## Definition of done

- Clicked through manually in the browser, with no console errors in normal use.
- Existing features (Cookbook, add form, Randomizer, import) still work.
- Typecheck and `npm run build` pass.
- New fields/tags appear everywhere they should: Cookbook cards, detail view, add/edit form, Randomizer filters.
- **Null/empty handling:** Randomizer filters must not silently exclude recipes whose tag values are null or empty.
- Every mutation revalidates the caches for every view it affects (Cookbook, Randomizer, detail) so changes show up immediately.
- Failures are never silent: a failed save or action shows a clear, visible error.

Before adding a taxonomy field or a server action, check `.claude/skills/` for a matching skill and follow it. It replaces the checklist above for that kind of work.

## Reference docs (read on demand)

- `docs/PERMISSIONS.md` — roles, the permission table, and the mutation checklist. Read before touching membership, invites, or role checks.
- `docs/ARCHITECTURE.md` — how the Global Pool, sharing, and the recipe card image work, and why. Read before changing any of them.
- `docs/ROADMAP.md` — phase status and planned work. Read before starting a new phase or making schema decisions for a planned feature. Update its status checklist when a phase completes.

Invariants to preserve while working on anything:
- Recipes belong to a Kitchen, not directly to a User. Don't collapse this.
- `forkedFromRecipeId` is live and actively used (Global Pool pulls, share-link pulls, kitchen auto-seeding), not a reserved-for-later field. Keep it in sync if the Recipe model changes.
- Ratings, notes, and cook history are intentionally shared per recipe for now (last write wins).
