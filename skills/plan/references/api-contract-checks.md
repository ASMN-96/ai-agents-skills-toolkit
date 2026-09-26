# API contract checks

When a plan touches an API, RPC, server action, or route consumed by more than
one client (web + mobile, or multiple services), work through these before
the spec is considered done.

## Inventory

- List every consumer: web app, mobile app, background jobs, external
  partners, webhooks.
- Name the request shape, response shape, error shape, auth model, cache
  keys, pagination, filtering, and sort behavior.
- Classify the change: **additive** (new optional field/endpoint),
  **behavioral** (same shape, different meaning), **breaking** (removes or
  retypes something a consumer reads), or **deprecated** (marked for
  removal on a timeline).

## Compatibility gates

- A breaking change needs a migration path for every listed consumer before
  it ships: versioned endpoint, dual-write period, or a coordinated release.
  Note which one in the spec.
- Public vs. private payload fields: check that nothing server-internal
  (internal IDs, other users' data, secrets) rides along in a response
  because it was convenient to include.
- If the API is backed by Supabase or Postgres RLS, the spec's acceptance
  criteria must include an explicit ownership/ACL check per exposed table,
  view, or RPC — "authenticated" is not the same as "authorized." Hand this
  off to the `data` route for the actual policy design.
- If generated types, client fixtures, or SDKs are produced from the schema,
  list them as tasks so they don't drift silently.

## What the spec should record

- Affected consumers and the compatibility classification above.
- The migration or rollout plan for anything breaking or behavioral.
- Which existing contract tests, typecheck, or lint commands will catch a
  regression — call out the gap as an explicit task if none exist.

## Stop and ask when

- The consumer list is unknown or a consumer can't be reached to confirm.
- A field's public/private boundary or the authorization model is unclear.
- The change is breaking and no owner has signed off on the migration plan.
