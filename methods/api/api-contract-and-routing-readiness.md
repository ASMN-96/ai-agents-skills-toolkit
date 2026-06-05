---
sourceRef: ["toolkit-authored","supabase-agent-skills"]
lastExtracted: 2026-06-06
status: approved
---

# API Contract And Routing Readiness

## Purpose

Protect API, RPC, server action, route, schema, and client contract changes before implementation or release claims.

## Required Checks

- Identify providers, consumers, request shape, response shape, error shape, auth model, cache keys, pagination, filtering, sorting, and version behavior.
- Classify compatibility: additive, behavioral, breaking, deprecated, or unknown.
- Check public/private payload boundaries and server-side authorization.
- For Supabase or Postgres-backed APIs, inventory Data API/table/view/RPC exposure and confirm BOLA/object-ownership checks before treating a route as safe.
- Check generated types, schema constraints, auth roles, RLS behavior, and migration timing when API contracts depend on database shape.
- Confirm route ownership, middleware, redirects, deep links, WebView/native clients, generated types, fixtures, and docs where relevant.
- Prefer existing contract tests, integration tests, typecheck, lint, and build commands before adding tooling.

## Evidence Requirements

Report affected consumers, compatibility decision, validation output, skipped checks, and rollback or staged rollout notes. Do not claim compatibility without observed tests or documented review evidence.

## Compact Example

Good pattern:

- Inventory web, mobile, background, and external consumers; classify compatibility; update types, fixtures, tests, docs, and rollback notes.

Bad pattern:

- Changing a response shape or route behavior before checking existing consumers and auth/data boundaries.

Evidence required:

- Consumer list, compatibility decision, observed validation output, skipped checks, and rollout or rollback path.

Stop condition:

- Pause when a breaking or authorization-sensitive change is possible without owner approval.

## Stop Conditions

- Consumer inventory is unknown.
- Public/private payload or authorization behavior is unclear.
- Breaking change is possible without owner approval.
- Route, cache, or middleware behavior cannot be validated but release readiness is requested.

## Source Inspiration / License Status

Supabase Agent Skills v0.2.3 guidance was adopted as cleanroom API/public-exposure and object-ownership gates only. Live Supabase operations remain delegated to the Supabase plugin or project-owned tooling when explicitly approved.
