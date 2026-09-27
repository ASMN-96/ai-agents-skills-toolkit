# Supabase RLS Audit Checklist

Checks specific to Supabase/Postgres tenant isolation. Use alongside
`security-checklist.md`'s Authorization section when the change touches a table,
policy, storage bucket, RPC function, or generated client.

## Classify the data surface first

Before reading policy SQL, label the table/row set: public, authenticated-user-owned,
tenant-scoped, admin-only, or service-role-only. Every check below depends on this
label being right — most RLS bugs are a table classified as one thing and policed as
another.

## RLS policy checks

- [ ] RLS is enabled on every table that holds non-public data (a table with no
      policies and RLS off is readable by any authenticated — or anon — key).
- [ ] Each policy's `USING`/`WITH CHECK` clause ties the row to the caller
      (`auth.uid()`, a tenant column) — not just to "is authenticated."
- [ ] `SELECT`, `INSERT`, `UPDATE`, `DELETE` are policed separately. With RLS on, an
      operation with no policy is denied; check that each allowed operation has its
      own scoped policy and that `for all` policies don't widen writes.
- [ ] Policies don't trust a client-supplied `user_id`/`tenant_id` column — they
      derive identity from the session (`auth.uid()`), never from row data the caller
      wrote.

## SECURITY DEFINER functions

- [ ] Owner is the minimum-privilege role needed, not a superuser/service role by
      habit.
- [ ] `search_path` is pinned (an unset search path lets a caller shadow a function
      or table with one in a schema they control).
- [ ] The function re-checks caller authorization internally — `SECURITY DEFINER`
      bypasses RLS, so the function *is* the access-control boundary now.
- [ ] Inputs are validated the same as any other boundary (this is a place SQL
      injection or scope-widening bugs hide).

## Data API / public surface

- [ ] Treat the Supabase Data API (auto-generated REST/GraphQL over tables) as a
      public API: inventory every exposed table, view, and RPC, and what the `anon`
      and `authenticated` roles can reach on each.
- [ ] A view built over a sensitive table still needs RLS-equivalent filtering — a
      view does not inherit safety just because the base table has policies if it's
      created with elevated privileges.

## Service-role and secrets

- [ ] The service-role key never ships to a browser bundle, mobile app, or any
      client-reachable code path — it bypasses RLS entirely.
- [ ] Server code that does use the service role re-implements the authorization
      check it just bypassed (ownership, tenant match) before acting.

## Migrations and generated types

- [ ] A migration that changes a table's shape also updates any policy that
      referenced the changed columns.
- [ ] Generated TypeScript types are regenerated after a schema change — code
      reviewing against stale types will approve a query that no longer matches
      the schema.
- [ ] Migrations are reviewed for reversibility and backfill impact; this route does
      not run migrations, so flag a live-database action as a finding, not perform it.

## What this route does not do

Read-only audit only — no live SQL, migration, or Supabase CLI/MCP call. If checking a
policy requires querying live data, say so as an open item instead of running it.
