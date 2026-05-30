---
name: riss-release-gate
description: Use for PR readiness, branch hygiene, GitHub checks, CodeRabbit/reviewdog triage, publish gates, release readiness, and post-merge handoff. Do not use to push to main, merge with pending required checks, or mark release ready without evidence.
---

# RISS Release Gate

## Role

Use this skill when branch state, PR readiness, CI checks, CodeRabbit feedback, reviewdog output, release gates, publish workflows, or post-merge readiness are in scope.

This skill coordinates evidence and release posture. It does not authorize direct pushes to main, bypassing required checks, CI workflow edits, external installs, MCP setup, global config changes, or release actions without explicit approval.

## Operating Rules

- Verify branch, upstream, working tree, and remote baseline before release claims.
- Keep CodeRabbit as contextual review input and reviewdog as deterministic scanner-output reporting only when useful.
- Avoid duplicate automated comments and style-only noise unless it hides real risk.
- Classify comments as required blocker, scoped fix, clarify, defer, or no action.
- Do not merge with required checks pending or failing.
- Keep final reports clear about what passed, what failed, what was skipped, and what still needs manual approval.

## Route Checks

Use available repository-owned evidence:

1. Local branch and working tree status.
2. Relevant validation commands.
3. GitHub PR status and required checks when a PR exists.
4. CodeRabbit status or comments when available.
5. Workflow lint/security checks only when workflow files change and tools are already configured.

Harden-Runner, reviewdog setup, actionlint setup, zizmor setup, or any CI workflow change requires separate approval.

## Review Focus

- No direct push to main.
- No merge with unresolved required blockers.
- No false release-readiness claims.
- Validation evidence maps to the changed surface.
- Branch, PR, checks, review, and manual QA status are explicit.
- CodeRabbit status is not inferred when unavailable.
- reviewdog is reported only as deterministic scanner-output evidence when scanner output exists.
- WARN output and skipped checks remain visible even when blocking validation passes.

## Completion Evidence

Report branch state, PR URL if created, checks run, check results, review status, skipped gates, WARN output, blockers, missing evidence, and the exact next action before any merge request. Follow `docs/NO_FAKE_VALIDATION_POLICY.md`; do not claim merge readiness from metadata-only records, dry-runs, skipped CI jobs, unavailable review status, or unobserved tool output.
