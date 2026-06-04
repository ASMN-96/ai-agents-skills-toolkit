---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# Cross-Surface Client Contracts

## Purpose

Protect compatibility across web, mobile, admin, public, backend, API, SDK, worker, and integration consumers. Client convenience must not become security authority.

## When To Use

Use when API, RPC, server action, SDK, schema, enum, status, payload, auth, cache, or contract behavior affects more than one consumer.

## When Not To Use

Do not use for isolated internal refactors with no contract or consumer impact.

## Required Checks

- Identify all consumers: web, mobile, admin, public, backend jobs, third-party integrations, tests, docs, and generated clients.
- Request/response compatibility: required fields, optional fields, nullability, defaults, pagination, filtering, sorting, and error shape.
- Enum/status/field compatibility: added, removed, renamed, retyped, deprecated, and unknown future values.
- Versioning and migration: old client behavior, new client behavior, staged rollout, feature flags, fallback, and data migration.
- Backwards compatibility and rollback: whether old clients can continue safely during rollout and after rollback.
- Shared schemas/types where appropriate, with clear runtime validation where trust boundaries exist.
- Server-side auth remains final authority; client filtering, hiding, routing, or cache keys are not security.
- Cache-key isolation for tenant/account/user/project/private payloads.
- Public/private payload split and least-privilege response design.
- API errors, loading, empty, disabled, retry, partial failure, and failure modes.
- Contract tests, fixtures, examples, docs, and generated client update requirements.
- Breaking-change approval, release notes, and rollback.

## Evidence Requirements

Report affected consumers, compatibility classification, contract tests/docs/fixtures, commands run, skipped checks, and owner decisions. Do not claim compatibility without evidence or documented review.

## Stop Conditions

- Consumer inventory is unknown.
- Breaking change is possible without owner approval.
- Public/private payload boundary is unclear.
- Server-side authorization or cache isolation is uncertain.
- Contract tests or fixtures are required but missing and no risk decision exists.

## Agent Routing

backend-contract-agent owns request/response contract review. qa-test-agent owns test evidence. security-review owns auth/public-private payload risk. database-rls-agent owns data isolation. pr-release-gate blocks release claims when contract risk is unresolved.
