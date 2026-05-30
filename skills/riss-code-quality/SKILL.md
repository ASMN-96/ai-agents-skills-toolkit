---
name: riss-code-quality
description: Use for React, TypeScript, hooks, tests, build quality, AI-generated code risk, and safe quality-gate routing. Do not use to add dependencies, change package managers, reformat broadly, or rewrite product architecture for scanner output.
---

# RISS Code Quality

## Role

Use this skill for code-quality work in TypeScript and React projects when correctness, maintainability, hooks behavior, test coverage, or build readiness matters.

This skill routes quality checks. It does not authorize dependency changes, package-manager changes, broad rewrites, CI edits, MCP setup, global config writes, or external tool activation.

## Operating Rules

- Start from the repository's existing scripts, configs, lockfiles, and code conventions.
- Prefer typecheck, lint, focused tests, and build checks already present in the project.
- Treat TypeScript suppressions, weak types, stale test assumptions, and broad AI-generated rewrites as review risks.
- Keep fixes scoped to the behavior or quality issue being addressed.
- Preserve working architecture unless the current architecture is the root cause and the user approves the larger change.
- Do not run or recommend external tool setup as part of the task; record missing tools as optional follow-up.

## Route Checks

Use available project-owned commands in this order:

1. TypeScript check.
2. Typed lint and React hooks lint.
3. Focused unit or component tests.
4. Build check when cheap and relevant.
5. Optional cleanup or scanner checks only when already configured.

React Doctor, Knip, Biome, Oxlint, dependency-cruiser, Madge, jscpd, and similar tools are metadata-only candidates unless already configured by the project.

## Review Focus

- Type boundaries are explicit and stable.
- Hooks follow React rules and dependency arrays are defensible.
- Loading, error, empty, disabled, and async states are handled.
- Tests cover changed behavior or critical regression risk.
- Scanner output is triaged by actual product risk, not followed blindly.
- No hidden package, lockfile, CI, or global config changes occur.
- Dry-run or metadata-only quality gates are not reported as real quality execution.
- WARN output is preserved in completion reports even when blocking checks pass.

## Completion Evidence

Report commands run, results, skipped checks, missing project scripts, WARN output, and remaining manual QA. Do not claim quality gates passed unless the relevant command output was actually observed. Follow `docs/NO_FAKE_VALIDATION_POLICY.md` for dry-run, mock, skipped, partial, fallback, and metadata-only states.
