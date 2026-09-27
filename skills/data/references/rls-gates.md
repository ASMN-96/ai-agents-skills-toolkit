# RLS and database-access gates

Toolkit-authored checklist, distilled from this project's own prior guidance
(v0.2.5 `methods/backend/supabase-postgres-rls-gates.md` and
`methods/backend/database-access-isolation-gates.md`). Use it as the final
gate before proposing or approving schema, RLS, or SECURITY DEFINER changes.

## Before touching schema or policies
- Classify the data surface first: public, authenticated-user,
  tenant-scoped, admin-only, or service-role-only. The policy shape follows
  from this classification, not the other way round.
- Read the current source of truth (existing migrations, schema files,
  generated types) before proposing a change — do not guess at the schema.
- Treat RLS, storage policies, and any Data-API-exposed table or view as a
  security boundary, not an implementation detail.

## Policy gates (every exposed table)
- RLS is enabled (and, where table ownership is untrusted, forced) on every
  table reachable from `anon` or `authenticated` — this includes every
  table in an exposed schema (`public` by default), whether or not it looks
  private.
- A separate policy per operation (`select`, `insert`, `update`, `delete`),
  scoped `to` the specific role — never one catch-all `for all` policy
  papering over different access rules.
- `insert`/`update` policies carry a `with check` that binds the owner or
  tenant column to `(select auth.uid())` (or the equivalent tenant-membership
  check) — without it, a user can write rows they don't own or reassign a
  row's owner to someone else.
- `update` policies also need a matching `using`, since Postgres RLS
  requires a `select`-visible row before it can be updated.
- No `using (true)` (or an always-true predicate) on a table or view that
  holds private or tenant-scoped data. Confirm any wide-open policy is
  intentional and documented.
- Views inherit the querying role's privileges unless created with
  `security_invoker = true` (Postgres 15+) — otherwise they silently bypass
  the base table's RLS.

## SECURITY DEFINER functions
- Only when RLS genuinely cannot express the check (e.g., a cross-tenant
  lookup). Prefer `SECURITY INVOKER`.
- Fixed `search_path` (`set search_path = ''` or an explicit schema list) —
  an unset search path is a privilege-escalation vector.
- An explicit `auth.uid()` (or caller-identity) check inside the function
  body — `SECURITY DEFINER` alone is not an authorization check.
- Keep it in a non-exposed schema and `revoke execute ... from public` when
  it isn't meant to be called directly; Postgres grants `EXECUTE` to
  `PUBLIC` by default.

## Verify before claiming done
- Test each policy as `anon`, as `authenticated` (a real, non-owner user),
  and as the owning user — not just as the table owner or `postgres`, which
  bypasses RLS by default.
- Re-run `explain` on any policy using a `SECURITY DEFINER` helper or a
  subquery to confirm it isn't re-evaluated per row.
- Report which roles/users were tested and which were not; do not claim RLS
  is safe on the strength of a single owner-role query.
