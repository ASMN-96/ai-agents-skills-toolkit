---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# Coding-Time Production Readiness

## Purpose

Provide coding-time governance for production-risk changes without claiming enterprise certification, Level 4, Level 5, broad runtime support, or production certification.

## Required Checks

- Identify user-impacting workflows, failure modes, and rollback path before editing.
- Confirm source of truth, branch state, affected files, and owner approvals.
- Preserve existing auth, data, privacy, package, CI, deployment, MCP/global, and product-repo boundaries.
- Prefer project-owned typecheck, lint, test, build, browser, scanner, and release scripts before proposing new tools.
- Keep recommended tools separate from executed tools.
- State dry-run, skipped, unavailable, metadata-only, planned, and partial checks honestly.

## Evidence Requirements

Completion evidence must include commands actually run, WARN output, skipped gates, residual risk, and no-fake-validation wording. Do not claim production readiness from metadata, dry-runs, or planned checks.

## Stop Conditions

- Required validation fails or cannot run and the risk is material.
- Rollback is unclear for a user-facing, data, auth, security, package, CI, or deployment change.
- The task requires unapproved package installs, CI wiring, MCP/global config, deployment config, external service permissions, product repo mutation, secrets, or destructive commands.
