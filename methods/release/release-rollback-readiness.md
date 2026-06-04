---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
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
- Define rollback: revert path, config undo, data recovery, feature flag, migration rollback, or manual mitigation.
- Avoid tags, releases, package publication, CI edits, external submissions, or deployment changes unless separately requested and approved.

## Evidence Requirements

Report exact commands run, observed pass/fail output, leak scan/source freshness status where relevant, PR state, merge status, final HEAD after merge, and remaining limitations.

## Stop Conditions

- Required checks fail, are pending, or cannot be verified.
- Review blockers remain.
- Current-tree leak blockers exist.
- Rollback is unclear for a production-impacting change.
- The request would create a tag, release, external submission, deployment, package, CI, MCP/global, or product-repo change outside approved scope.
