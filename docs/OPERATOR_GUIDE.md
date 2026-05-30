# Operator Guide

## Purpose

This guide gives operators clear prompt patterns for using the toolkit without blurring planning, implementation, validation, release evidence, or runtime activation.

The default safe sequence is:

1. Inspect current repo state.
2. Pick a mode and scope.
3. State the do-not-touch list.
4. Make focused local changes on a feature branch when implementation is approved.
5. Run relevant validators.
6. Report WARN output, skipped checks, dry-runs, and remaining risk.
7. Push or open a PR only after local evidence is reviewable.

## Planning-Only Prompt

Use this when you want an audit, design, risk review, or implementation sequence without file changes.

```text
Use governance. Mode: planning only.
Audit the repo for <objective>.
Do not edit files, install dependencies, change CI, modify global config, or push.
Return findings, risks, a sequenced plan, validation gates, and owner decisions.
```

Required behavior:

- Read local source of truth before conclusions.
- Treat registries, manifests, source records, and `.ai-toolkit` as metadata unless runtime evidence exists.
- Separate blockers, warnings, and owner decisions.
- Do not mark dry-runs, skipped checks, or planned checks as executed validation.

## Controlled Implementation Prompt

Use this when a specific scoped change is approved.

```text
Mode: controlled implementation.
Implement <specific change> on a feature branch.
Scope is limited to <files or areas>.
Do not install packages, change CI, edit secrets, modify production config, write outside this repo, push, or merge.
Run <expected validators> and report actual output, WARNs, skipped checks, and remaining risks.
```

Required behavior:

- Work locally first.
- Keep each change reviewable and reversible.
- Stop before package, CI, credential, MCP, global config, database, production, or product-repo changes unless separately approved.
- Commit only after fresh validation evidence.

## Review And Release Prompt

Use this when preparing a branch or PR for review.

```text
Mode: release review.
Check branch state, local diff, validators, PR status if available, required checks, review comments, and release blockers.
Do not merge until I explicitly approve.
```

Required behavior:

- Verify current branch and remote state when GitHub status matters.
- Treat CodeRabbit or other review tools as support evidence only when actually checked.
- Preserve WARN output and known drift in the report.
- Do not claim enterprise or public release readiness from local validation alone.

## Quality-Gate Honesty

`scripts/ai-toolkit/run-quality-gate.mjs --dry-run` is capability detection only. It reports package manager, scripts that would be selected, missing scripts, and approval-required tools. It is not validation evidence.

Without `--dry-run`, the script may count as validation only when it actually runs project scripts and reports `quality status: scripts-passed`. If no package file, package manager, or runnable scripts exist, the quality status is `not-run`.

## Final Report Shape

Every completed implementation report should include:

- Summary of actual changes.
- Files changed.
- Checks run and observed results.
- WARN output and skipped or mock checks.
- Security or production risks found.
- Remaining issues, assumptions, and next steps.
