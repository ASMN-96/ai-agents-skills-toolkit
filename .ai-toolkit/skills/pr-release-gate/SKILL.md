---
name: pr-release-gate
description: Use for PR readiness, branch hygiene, checks, review feedback, release gates, publish readiness, and post-merge handoff. Do not push to main, merge with pending required checks, or mark release ready without evidence.
---

# PR Release Gate

Use this as the canonical final release gate skill for branch, PR, CI, review, and publish-readiness work.

This skill coordinates evidence and release posture. It does not authorize direct pushes to main, bypassing required checks, CI workflow edits, external installs, MCP setup, global config changes, or release actions without explicit approval.

## Review Focus

- Branch, upstream, working tree, and PR state are verified.
- Required checks and review feedback are classified before merge recommendations.
- Contextual review services are support evidence only and never override repository policy.
- Large PRs use changed-file neighborhood selection and compact context packs instead of whole-repo dumps.
- WARN output, skipped gates, and unavailable checks remain visible.

## Completion Evidence

Report branch state, PR URL if present, checks run, review status, skipped gates, WARN output, blockers, and exact next action.
