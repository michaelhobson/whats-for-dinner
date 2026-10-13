# Kitchen Permission Levels

Read this before touching membership, invites, or any role check.

Roles are scoped per KitchenMembership. A user can hold different roles in different kitchens. Never treat role as a global per-user property.

## Roles

| Role | Recipes (add/edit/delete, incl. import) | Rate, note, log cooks | Kitchen settings and membership |
|---|---|---|---|
| **RESTAURATEUR** | Yes | Yes | Full control: add/remove members, set roles, change all settings |
| **CHEF** | Yes | Yes | View only |
| **DINER** | No (read-only) | Yes | View only |

Rating, notes, and cook history are open to Diners on purpose. They are low-risk personal-use actions, not content changes.

Assume a Restaurateur can do anything possible within a kitchen.

All members, regardless of role, can view all recipes and use the randomizer and dinner-selection features.

## Invariant: at least one Restaurateur

A kitchen must always have at least one Restaurateur. Block the last remaining Restaurateur from demoting themselves or leaving or being removed from the kitchen. They must promote another member to Restaurateur first.

## Shared feedback (current behavior)

Ratings, notes, and cook history are shared per recipe: one value per recipe, visible and editable by any member with permission to do so, last write wins. This is intentional for now, not an oversight. See "Per-person recipe feedback" in `docs/ROADMAP.md` for the planned change.

## Global Pool and share links

The Global Pool is just a Kitchen (`isGlobalPool: true`) — the role table above applies to it unchanged. Adding/editing/deleting recipes there is CHEF-or-above, exactly like any other kitchen.

Two deliberate, narrow exceptions to "a kitchen's recipes are only visible to its members":
- Anyone logged in can browse the Global Pool and view a recipe via its public share link, read-only.
- A kitchen member (any role, including Diner) can view and copy an *existing* share link for a recipe in their kitchen. Only CHEF-or-above can generate or revoke one — the same role check as editing that recipe.

Rating, notes, and cook history stay gated on actual kitchen membership even on a page reachable via one of these exceptions — a non-member never gets those controls, regardless of what they can see.

## Checklist for any mutation

1. Resolve the kitchen via `getKitchenId()`.
2. Look up the caller's membership in that kitchen.
3. Check the role against the table above.
4. Return a visible error if the check fails. Never fail silently.