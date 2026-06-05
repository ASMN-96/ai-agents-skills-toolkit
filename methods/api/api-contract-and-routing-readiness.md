---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# API Contract And Routing Readiness

## Purpose

Protect API, RPC, server action, route, schema, and client contract changes before implementation or release claims.

## Required Checks

- Identify providers, consumers, request shape, response shape, error shape, auth model, cache keys, pagination, filtering, sorting, and version behavior.
- Classify compatibility: additive, behavioral, breaking, deprecated, or unknown.
- Check public/private payload boundaries and server-side authorization.
- Confirm route ownership, middleware, redirects, deep links, WebView/native clients, generated types, fixtures, and docs where relevant.
- Prefer existing contract tests, integration tests, typecheck, lint, and build commands before adding tooling.

## Evidence Requirements

Report affected consumers, compatibility decision, validation output, skipped checks, and rollback or staged rollout notes. Do not claim compatibility without observed tests or documented review evidence.

## Stop Conditions

- Consumer inventory is unknown.
- Public/private payload or authorization behavior is unclear.
- Breaking change is possible without owner approval.
- Route, cache, or middleware behavior cannot be validated but release readiness is requested.
