---
name: code-quality
description: Use for React, TypeScript, hooks, tests, build quality, maintainability, AI-generated code risk, and safe quality-gate routing. Do not use to add dependencies, change package managers, reformat broadly, duplicate Superpowers, or rewrite architecture for scanner output.
---

# Code Quality

Use this as the canonical final code-quality skill for web application changes.

This skill routes quality checks through project-owned scripts first. It does not authorize dependency changes, package-manager changes, broad rewrites, CI edits, MCP setup, global config writes, external tool activation, or duplicating Superpowers execution discipline.

## Route Checks

Prefer available project-owned checks in this order: typecheck, lint, focused tests, build, then optional scanners only if already configured.

## Measurable Quality Targets

- Changed behavior needs focused tests or a documented exception with residual risk.
- Coverage percentages count only when the project already measures coverage and the command actually ran.
- For critical business, auth, data, payment, release, or public API behavior, prefer branch/edge assertions over broad snapshot-only checks.
- Do not invent coverage numbers, pass rates, or quality gates from registry metadata, generated files, or recommended scripts.

## Review Focus

- Type boundaries are explicit and stable.
- React hooks, async state, and rendering behavior are correct.
- Loading, error, empty, disabled, failure, and recovery states are handled.
- Tests cover changed behavior or critical regression risk.
- Generated or changed production code receives a guard pass for broad error swallowing, hardcoded success paths, invented APIs, copy-from-similar mistakes, unnecessary abstractions, and dead code introduced by the change.
- Generated or changed tests are reviewed for behavior assertions, justified system-boundary mocks, real state/value objects, data-driven variants where appropriate, preserved production regressions, and removal of tests that only verify framework guarantees.
- Existing TypeScript, typed ESLint, React Hooks, Vitest, Testing Library, and build scripts are used when project-owned.
- Dry-run, skipped, unavailable, metadata-only, or planned quality gates are not reported as real execution.
- Route React projects to React Doctor as `active-if-detected` when project-owned and `owner-approved-install` when absent; it supplements ESLint, React Hooks, tests, and browser evidence.
- Treat Playwright, Oxlint, Semgrep, dependency-cruiser, Madge, jscpd, actionlint, zizmor, Gitleaks, and OSV Scanner as usable only when project-owned or owner-approved. Start new/noisy CI use as `ci-advisory`; promote to blocking only after calibration and owner approval.
- Route performance, scalability, and cache-sensitive changes through `.ai-toolkit/methods/performance/performance-scalability-cache-readiness.md`. Canonical toolkit source: `methods/performance/performance-scalability-cache-readiness.md`.
- Route cross-surface API/client compatibility through `.ai-toolkit/methods/architecture/cross-surface-client-contracts.md` when frontend changes affect multiple consumers. Canonical toolkit source: `methods/architecture/cross-surface-client-contracts.md`.
  Use `.ai-toolkit/methods/api/api-contract-and-routing-readiness.md` for explicit API route or contract readiness. Canonical toolkit source: `methods/api/api-contract-and-routing-readiness.md`.

## Guard-Pass Boundaries

Guard-pass review is reviewer judgment unless a project-owned command actually ran and output was observed. Do not create or invoke external `clean-code-guard`, `test-guard`, or `docs-guard` skills from this toolkit. Documentation claim checks route through `governance` and `.ai-toolkit/methods/internal/documentation-accuracy-guard.md` when docs mention concrete symbols, commands, flags, routes, config keys, paths, examples, or behavior.

## Completion Evidence

Report commands run, results, skipped checks, WARN output, and residual quality risk.
