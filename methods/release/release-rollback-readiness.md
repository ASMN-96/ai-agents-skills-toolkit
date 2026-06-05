---
sourceRef: ["toolkit-authored","supabase-agent-skills"]
lastExtracted: 2026-06-06
status: approved
---

# Release Rollback Readiness

## Purpose

Gate PR, merge, release-candidate, and post-merge decisions on observed evidence, rollback clarity, and honest limitations.

## Required Checks

- Confirm branch, upstream, working tree, PR, checks, review status, and source freshness when relevant.
- Confirm changed files do not include forbidden surfaces unless explicitly approved.
- Run project-owned validation before merge or release claims.
- Preserve WARN output and skipped/unavailable gates in the report.
- Define rollback: revert path, config undo, data recovery, feature flag, migration rollback, type/schema rollback, or manual mitigation.
- For Supabase/database/API/auth changes, include RLS/policy impact, exposed table/view/RPC surface, SECURITY DEFINER impact, generated-type drift, staging/production differences, and data backfill recovery in the release gate.
- Do not treat source freshness as complete while an active source remains in passive `REVIEWED_HELD`; require a resolved outcome or a documented archive/remove decision.
- Avoid tags, releases, package publication, CI edits, external submissions, or deployment changes unless separately requested and approved.

## Evidence Requirements

Report exact commands run, observed pass/fail output, leak scan/source freshness status where relevant, PR state, merge status, final HEAD after merge, and remaining limitations.

## Compact Example

Good pattern:

- Confirm branch, PR/check/review state, version and release-note consistency, validation output, source freshness/leak scan when relevant, and rollback notes before readiness posture.

Bad pattern:

- Marking a release ready because checks are planned, CI exists, a PR is open, or a dry-run had no local blockers.

Evidence required:

- Exact observed command/check output, WARN lines, skipped/pending gates, PR state, merge/no-merge posture, and rollback or recovery path.

Stop condition:

- Pause when checks fail/pending, blockers remain, rollback is unclear, or release/tag/deploy/package/CI/product-repo actions need approval.

## Stop Conditions

- Required checks fail, are pending, or cannot be verified.
- Review blockers remain.
- Current-tree leak blockers exist.
- Rollback is unclear for a production-impacting change.
- The request would create a tag, release, external submission, deployment, package, CI, MCP/global, or product-repo change outside approved scope.

## Source Inspiration / License Status

Supabase Agent Skills v0.2.3 guidance was adopted as cleanroom release gates for database/API/auth risk only. Live Supabase operations remain delegated to the Supabase plugin or project-owned tooling when explicitly approved.
