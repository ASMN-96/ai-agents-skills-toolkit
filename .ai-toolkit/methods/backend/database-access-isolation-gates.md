---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-06-09
status: approved
---

# Database Access Isolation Gates

## Purpose

Define portable safety gates for Postgres, ORM, auth, query, migration, and tenant-isolation work before implementation or review claims.

## When To Use

Use when a task touches Postgres schemas, hosted Postgres providers, SQL migrations, ORM models or queries, generated clients, auth/session ownership checks, tenant isolation, public/private payloads, or database performance. This includes stacks such as Neon Postgres, Drizzle, Prisma, Better Auth, raw SQL, and Supabase when RLS is not the only relevant boundary.

## When Not To Use

Do not use for frontend-only changes, static docs changes, or backend work that does not touch data access, auth, persistence, authorization, or database behavior. Use `methods/backend/supabase-postgres-rls-gates.md` when the task is specifically about Supabase project settings, Supabase Data API exposure, storage policies, or RLS policy behavior.

## Agent Roles That Should Embed It

Backend Contract Agent, Database RLS Agent, Security Agent, QA Test Agent, Reviewer Agent.

## Operating Rules

- Start by classifying the data surface: public, authenticated user, tenant-scoped, admin-only, service-role-only, or provider-admin.
- Verify the current source of truth before database guidance: schema files, migrations, ORM models, generated types, auth/session code, project instructions, and provider-specific docs when needed.
- Treat database access as a security boundary even when there is no Supabase RLS layer.
- Inventory all access paths: server routes, RPC/server actions, background jobs, direct SQL, ORM queries, generated clients, admin scripts, seed data, fixtures, and public API payloads.
- Check object ownership and tenant isolation at the same grain as the queried object, including joins, relation preloads, nested writes, batch operations, pagination, and cache keys.
- Prefer server-side authorization checks and constrained query builders over client-provided filters, hidden UI state, or caller-controlled tenant IDs.
- For migrations, check reversibility, data backfill impact, locking/concurrency risk, constraints, indexes, generated-type drift, deploy ordering, and rollback or recovery path.
- For query-performance work, identify the query shape, indexes, row volume assumptions, isolation constraints, and expected measurement before proposing changes.
- Keep provider/admin credentials, database URLs, JWT secrets, service-role keys, and production data out of review unless explicitly authorized in a separate task.

## Verification Requirements

Report the data surface, files or migrations reviewed, access paths, ownership and tenant-isolation checks, validation command or reason it could not run, and remaining manual checks. For implementation work, include migration/test evidence and rollback or recovery notes.

## Risks / Anti-Patterns

Assuming ORM filters are authorization, trusting client-supplied tenant IDs, missing relation or batch-write ownership checks, treating local schema as production truth, running live mutations during review, exposing provider/admin credentials, or optimizing queries without isolation evidence.

## Source Inspiration / License Status

Toolkit-authored portable database governance. No raw upstream skill, prompt, script, provider documentation, or runtime behavior was copied or activated.
