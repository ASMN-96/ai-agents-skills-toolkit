---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-06-07
status: approved
---

# Governance-Lite Router Mode

## Purpose

Provide a concise governance mode for normal implementation work without adding another active skill. Governance-lite is a toolkit-authored method and routing posture only; it is not a runtime skill, plugin, agent, MCP server, install path, or global configuration.

## When To Use

Use when the task needs scoped routing, validation honesty, stop conditions, and source-of-truth checks, but does not need a large audit or full release plan.

Good fits:

- small or medium implementation on an approved branch;
- PR repair with known changed files;
- documentation or registry updates that still require source-safety boundaries;
- release support where checks, WARN output, review state, and no-fake-validation rules matter.

## When Not To Use

Do not use this method to approve package changes, lockfile changes, CI wiring, MCP/global config, external tool activation, product-repo writes, secret access, database/auth/security weakening, or broad generated artifact rewrites.

Do not create `governance-lite`, `router-lite`, or any similar sixth active skill. Route through the existing `governance` skill and this method metadata.

## Router Steps

1. Confirm branch/source truth when it matters.
2. Classify affected surfaces: docs, registries, methods, templates, evals, runtime mirrors, source records, tooling metadata, product repos, package/CI/MCP/global config, auth/security/data, or release.
3. Select the smallest profile, methods, agents, and support tools needed.
4. Classify GSD status as `not needed`, `lens only`, `selected`, `invoked`, or `blocked-unavailable`; tiny tasks should avoid GSD artifact churn, while serious work must use GSD or an explicit manual phase/state fallback.
5. Classify Superpowers status as `not needed`, `selected`, `invoked`, or `blocked-unavailable`.
6. Route package-manager command recommendations through `methods/repo/package-manager-workspace-migration.md`; detect or owner-confirm the package manager first and do not assume npm.
7. Classify tool posture: `active-if-detected` for existing project-owned tools, `owner-approved-install` for absent tools, `ci-advisory` for noisy/new CI use, and `ci-blocking-after-calibration` only after stable evidence and owner approval.
8. Separate selected tools from executed tools.
9. State stop conditions before risky actions.
10. Run the narrowest useful validation first, then broader gates when the blast radius requires it.
11. Preserve WARN output and skipped/unavailable checks in the completion report.

## Stop Conditions

- Source freshness fails before source/utilization or release work.
- The task would add a sixth skill or change active runtime shape.
- A package, lockfile, CI, MCP/global config, deployment, product repo, database, auth, security, or secret surface appears without explicit approval.
- Package-manager signals are missing or conflicting and the task depends on package-manager commands.
- A missing tool would be installed/configured or a CI blocker would be added without owner approval and calibration.
- A generated artifact would be hand-edited instead of regenerated through the documented repo workflow.
- A dry-run, registry entry, source record, template, metadata file, or selected tool would be reported as executed validation.
- CodeRabbit or another external review status is unavailable and would be reported as passed.
- Serious multi-step work would continue without GSD or explicit manual GSD-equivalent phase/state tracking.

## Completion Evidence

Report:

- branch and HEAD;
- selected profile/methods/agents/tools;
- GSD and Superpowers status with one-line reasons;
- files changed;
- validation commands and observed output;
- WARN/skipped/unavailable checks;
- runtime count if runtime surfaces are in scope;
- source freshness and leak scan status if release/source/public-safety surfaces are in scope;
- remaining owner decisions and next action.
