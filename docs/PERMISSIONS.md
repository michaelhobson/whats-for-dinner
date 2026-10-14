# Kitchen Permission Levels

Read this before touching membership, invites, or any role check.

Roles are scoped per KitchenMembership. A user can hold different roles in different kitchens. Never treat role as a global per-user property.

## Roles

| Role | Recipes (add/edit/delete, incl. import) | Rate, note, log cooks | Kitchen settings and membership |
|---|---|---|---|
| **RESTAURATEUR** | Yes | Yes | Full control: add/remove members, send/revoke invites, set roles, change all settings |
| **CHEF** | Yes | Yes | View only |
| **DINER** | No (read-only) | Yes | View only |

In code: `canEditRecipes` is true for Chef and above; `canManageKitchen` is true for Restaurateur only (`lib/permissions.ts`).

Rating, notes, and cook history are open to Diners on purpose. They are low-risk personal-use actions, not content changes.

Assume a Restaurateur can do anything possible within a kitchen.

All members, regardless of role, can view all recipes and use the randomizer and dinner-selection features.

## Invariant: at least one Restaurateur

A kitchen must always have at least one Restaurateur. Block the last remaining Restaurateur from demoting themselves or leaving or being removed from the kitchen. They must promote another member to Restaurateur first. This is enforced server-side on demote, remove, and leave.

## Shared feedback (current behavior)

Ratings, notes, and cook history are shared per recipe: one value per recipe, visible and editable by any member with permission to do so, last write wins. This is intentional for now, not an oversight. See "Per-person recipe feedback" in `docs/ROADMAP.md` for the planned change.

## Global Pool and share links

The Global Pool is just a Kitchen (`isGlobalPool: true`), so the role table above applies to it unchanged. Adding, editing, or deleting recipes there is CHEF-or-above, exactly like any other kitchen.

Two deliberate, narrow exceptions to "a kitchen's recipes are only visible to its members," both read-only:
- **Global Pool:** any logged-in user can browse it and view its recipes.
- **Share links:** anyone with a recipe's `/share/[token]` link can view that recipe. No login is required, because the route is public.

Managing share links:
- Any kitchen member (any role, including Diner) can view and copy an *existing* share link for a recipe in their kitchen.
- Only CHEF-or-above can generate or revoke one, the same role check as editing that recipe.

Rating, notes, and cook history stay gated on actual kitchen membership even on a page reachable via one of these exceptions. A non-member never gets those controls, regardless of what they can see.

## Checklist for any mutation

1. Determine the target kitchen. For creates, that is the active kitchen (`getKitchenId()`). For anything acting on an existing recipe or kitchen by ID, load it and use *its* kitchen, not the caller's active one.
2. Confirm the caller is a member of that kitchen (`getAllKitchenIds()`) and fetch their role there (`getKitchenRole()`).
3. Check the role with `canEditRecipes` or `canManageKitchen`, in the server action itself. Hiding a button in the UI is not enforcement.
4. Return a visible error if any check fails. Never fail silently.
