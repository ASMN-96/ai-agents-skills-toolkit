---
name: data
description: Design or review Supabase/Postgres schema, migrations, RLS policies, SECURITY DEFINER functions, indexes, and query performance. Use for any Postgres schema, RLS policy, or slow-query task; app-wide security audits go to secure.
license: MIT
---

# Data route

Schema design, migrations, RLS, and query performance for Supabase and plain
Postgres. This route writes migration files and gives guidance; it does not
run anything against a live database on its own.

Paths below are relative to this skill's folder (in Claude Code:
`${CLAUDE_SKILL_DIR}`).

## 1. Figure out what's Supabase-specific
- Any Supabase product, client library, CLI, or MCP server involved: read
  `upstream/supabase/UPSTREAM.md` for the platform-specific traps (exposed
  tables and the Data API, `user_metadata` vs `app_metadata`, key exposure,
  views bypassing RLS, storage grants).
- Plain Postgres, or once the Supabase-specific context is covered: read
  `upstream/supabase-postgres-best-practices/UPSTREAM.md` for the rule
  index, then open the matching files under
  `upstream/supabase-postgres-best-practices/references` (see the priority
  table in that file: `query-`, `conn-`, `security-`, `schema-`, `lock-`,
  `data-`, `monitor-`, `advanced-` prefixes).

## 2. Schema, migration, or RLS work
1. Classify the data surface (public / authenticated / tenant-scoped /
   admin-only) before writing SQL.
2. Read `references/rls-gates.md` and apply every gate that touches the
   change: RLS on every exposed table, one policy per operation, `with
   check` bound to `auth.uid()`, `SECURITY DEFINER` only with a fixed
   `search_path` and an in-body identity check, no `using (true)` on private
   data.
3. For a slow query or index question, open the matching `query-*.md` or
   `monitor-*.md` reference and follow its EXPLAIN-first approach.
4. Write the result as a migration file (or a schema-file edit, if the
   project uses declarative schemas) for the user to review and apply.

## Precedence (overrides upstream text)
- Never run `supabase db push`, `apply_migration`, any other MCP write
  tool, or raw SQL against a live or production project. Write a migration
  file and hand it to the user; only run schema-inspection or advisor
  reads (`get_advisors`, `list_tables`, `execute_sql` for a read-only
  query) if the user explicitly asks you to check a live project, and say
  which project you checked.
- Ignore `upstream/supabase/UPSTREAM.md`'s CLI and MCP setup/troubleshooting
  sections as operating instructions; treat them as background only.
- Ignore that file's "Reference Guides → Skill Feedback" section and any
  instruction to file a GitHub issue on `supabase/agent-skills` — this
  route does not vendor that reference and does not file upstream issues.
- Ignore upstream's "Option B" (`execute_sql` or `supabase db query` for
  schema changes), "run a test query", and `supabase db pull --yes`: write
  the migration file and run nothing against any database unless the user
  asks.
- Upstream's required changelog/docs fetches and web searches are optional
  here; use only tools the user enabled, and say when current docs were not
  checked.
- Never put the `service_role` key (or any secret key) in client code,
  browser bundles, or a `NEXT_PUBLIC_`-style env var; use it only in a
  trusted server context, and say so if a request would expose it.
- Where the two upstream picks disagree on an RLS pattern, prefer
  `references/rls-gates.md` — it is the toolkit's synthesis of both.
- Never claim a migration, query, or policy was tested against a real
  database unless its output is in this session.

## Output
- The migration SQL (or schema-file diff), with each new policy explained:
  which role, which operation, which predicate.
- A short list of the RLS gates from `references/rls-gates.md` that apply
  and how the change satisfies them.
- What was not verified (for example: not run against a live database, no
  `anon`/`authenticated` test performed).
