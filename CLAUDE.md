@AGENTS.md
## 1. Project Overview

"What's For Dinner?" is a personal recipe database and randomizer, built for the developer and his girlfriend to use at home, that helps decide what to make for dinner by picking from (and filtering) a curated list of recipes they've cooked or want to try. This is a personal-use project for two people, not a multi-user or public product — no auth, accounts, or user management are needed.

## 2. Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database ORM:** Prisma
- **Database:** SQLite (local file, for now — may migrate to hosted Postgres if/when this becomes a deployed web app; don't make that change unless explicitly asked)
- **Package manager:** whatever `create-next-app` sets up by default (npm unless told otherwise)

## 3. Architecture & Directory Structure

Standard Next.js App Router conventions apply. As a general guide:

```
/app
  /recipes          — browse page, [id] detail page
  /recipes/new       — add-recipe form
  /randomize         — randomizer page
  page.tsx           — homepage
/prisma
  schema.prisma      — Recipe data model
  seed.ts            — seed script for sample data
/components          — shared UI components (nav bar, recipe card, etc.)
/lib                 — shared helpers (e.g. Prisma client singleton, filtering logic)
```

Keep data-fetching logic in server components or route handlers where possible rather than client-side fetches, per standard Next.js App Router practice. Update this section if the actual structure diverges meaningfully from this as the project grows.

## 4. Core Commands

- `npm run dev` — start the local dev server
- `npx prisma migrate dev` — apply schema changes to the local SQLite database
- `npx prisma studio` — open a GUI to inspect/edit the database directly (useful for debugging without writing queries)
- `npx tsx prisma/seed.ts` (or equivalent) — re-run the seed script
- `git add . && git commit -m "..."` — commit a working checkpoint after each completed phase

## 5. Database Safety

Never run a script or command that deletes, truncates, or resets data (deleteMany, migrate reset, db push --force-reset, etc.) against the production database. Any destructive database operation must default to the LOCAL database only, and must require explicit confirmation from me before running against production. When in doubt about which database a command will affect, ask before running it.

## 6. Code & Design Conventions

- **TypeScript throughout** — no plain `.js` files for app code.
- **Component style:** functional components with hooks; no class components.
- **Styling:** Tailwind utility classes; avoid introducing a second styling system (no CSS modules, styled-components, etc.) unless there's a strong reason.
- **Visual tone:** warm, appetizing, a little playful — this is a fun household tool, not enterprise software. Some visual flourish (icons, color, animation on the randomizer) is welcome and encouraged, not something to strip out for minimalism's sake.
- **Mobile-friendly:** layouts should work on a phone-sized screen as well as a laptop browser, since this will eventually be used from a phone.
- **Dependencies:** prefer what's already installed; only add a new package when it clearly earns its place (e.g. an animation helper), and mention what was added and why.
- **Comments:** not required for every function, but leave a short comment anywhere the logic is non-obvious (e.g. the two-level cuisine selector, random-draw-without-repeats logic).

## 7. Definitions of Done

A feature/phase is done when:

- It works when clicked through manually in the browser (not just "the code looks right") — assume the person reviewing is checking behavior, not code.
- There are no console errors in the browser dev tools during normal use of the new feature.
- Existing features from prior phases still work (don't regress the recipe list, form, or randomizer while building a new piece).
- The dev server starts cleanly with `npm run dev` and the relevant page loads without a crash.
- New fields/tags added to the data model are reflected everywhere they should appear (browse cards, detail view, add-recipe form, randomizer filters) — a tag that only exists in the database but isn't visible/filterable anywhere is not done.

## 8. Current Status

*Update this section as phases are completed, so future sessions know where things stand.*

- [x] Phases 1.1-6 — Project setup, basic features, anmd initial polish
- [x] Phase 2.1 — Foundation
- [x] Phase 2.2 — Push to Web
- [ ] Phase 2.3 — Import
- [ ] Phase 2.4 Accounts ("Kitchens")
- [ ] Phase 2.5 — Share
- [ ] Phase 2.6 — Planning tools

## 9. Future Architecture Notes

These are future design considerations to be aware of that should be accounted for when making changes now.

**Accounts model (planned):** Recipes, ratings, notes, and cook history belong to a "Kitchen," not directly to a User. A KitchenMembership join table links Users to Kitchens with a role (Restaurateur/Chef/Diner). MVP: every user gets one personal Kitchen, solo membership, Restaurateur role. This is intentional scaffolding for a future household model where a Kitchen has multiple members with different roles, and a User can belong to multiple Kitchens. Do not simplify this back to a direct User-owns-Recipe relationship, even though MVP usage looks identical to that.

**Recipe provenance (planned):** Recipe has nullable `sourceUrl` and `forkedFromRecipeId` fields, unused until cross-kitchen recipe sharing is built. Keep these fields when touching the Recipe model.

## 10. Non-Goals / Out of Scope (for now)

We'll be adding new features over time, including in the current phases. What follows is roughly the order we'll be addding these features. Don't add these unless explicitly requested in a prompt, even if they seem like natural next steps:

- Recipe importation features
- User accounts, login, or authentication
- Meal planning / calendar / grocery-list features
- Additional randomization modes
- Sharing recipes
