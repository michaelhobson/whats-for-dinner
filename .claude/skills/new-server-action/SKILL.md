---
name: new-server-action
description: Use whenever adding or changing a server action/mutation in the What's For Dinner app — creating, updating, or deleting recipes, kitchen memberships, invites, ratings, notes, or cook history, or any other write operation under /app/actions. Trigger this even for what looks like a small or routine change, since kitchen-scoping, permission enforcement, and cache revalidation are each easy to skip individually and every one of them has caused a real bug in this app before.
---

# New server action / mutation checklist

Every mutation in this app needs to get three things right, independently of each other: who it's scoped to, who's allowed to run it, and what it refreshes afterward. Missing cache revalidation already caused imported recipes to not appear until an unrelated action triggered a refresh — treat that as a live warning, not history.

## 1. Scope it to the right kitchen

- For writes, get the kitchen via `getKitchenId()` from `lib/kitchen.ts`. Never trust a `kitchenId` passed from the client for a write — look it up server-side from the session.
- For reads spanning more than one kitchen, use `getKitchenIds()`.
- Every Prisma query in the action should filter by kitchen. A query that doesn't is a potential cross-kitchen data leak, not just a bug.

## 2. Enforce the permission model server-side

Reference `docs/PERMISSIONS.md` — role is per-`KitchenMembership`, never a global property of the user:

- **RESTAURATEUR** — full permissions, including kitchen settings and membership.
- **CHEF** — recipes (add/edit/delete/import), rate, notes, cook history. Cannot change settings or membership.
- **DINER** — read-only on recipes and settings/membership, but *can* rate, write notes, and log cook history (these count as low-risk personal actions, not content changes).

Check the actual `KitchenMembership` role inside the server action itself — hiding a button in the UI is not enforcement, since the action can still be called directly. If the action touches membership or roles (invites, promotions, removals), protect the standing invariant: a kitchen must always have at least one Restaurateur. Block a solo Restaurateur from demoting themselves or being removed/leaving until someone else is promoted first.

## 3. Never fail silently

Per CLAUDE.md's Definition of done, any failure path — a bad input, a permission check that fails, a database error — must surface a clear, visible error to the user. A failure that only shows up in the server console doesn't count as handled.

## 4. Revalidate every affected view

List out, specifically, which pages show the data this action touches, and call `revalidatePath`/`revalidateTag` for each one. Typical candidates in this app:

- `/recipes` (browse)
- `/recipes/[id]` (detail)
- `/randomize`
- `/settings` and its kitchen sub-pages, if membership or roles changed

Don't assume a page will pick up the change on its own. Test it directly: make the change, then immediately check each affected page without taking some unrelated action first (that unrelated-refresh workaround is the exact symptom of the bug this step prevents).

## 5. Match existing conventions

TypeScript throughout, functional style, land the action in the right file under `/app/actions` (`recipes.ts`, `import.ts`, etc.) and only start a new file for a genuinely new domain — as recent examples, `global-pool.ts` and `share.ts` each earned their own file because they're a distinct domain, not because the existing files were getting long. If the action needs an AI API call for multiple items (e.g. several ambiguous ingredient lines), batch it into one request rather than one call per item, and prefer rule-based logic first per CLAUDE.md's Conventions. If a similar mechanic already exists elsewhere (e.g. a copy/fork operation), extend it rather than writing a parallel version — see CLAUDE.md's "Reuse over parallel implementations."

## Before calling it done

Click through it manually in the browser per CLAUDE.md's Definition of done: the mutation works, a deliberately-triggered failure shows a clear error, every affected view updates immediately with no extra refresh needed, and nothing from prior phases regressed.