---
name: code-quality
description: Use for React, TypeScript, hooks, tests, build quality, maintainability, AI-generated code risk, and safe quality-gate routing. Do not use to add dependencies, change package managers, reformat broadly, duplicate Superpowers, or rewrite architecture for scanner output.
---

# Code Quality

Use this as the canonical final code-quality skill for web application changes.

This skill routes quality checks through project-owned scripts first. It does not authorize dependency changes, package-manager changes, broad rewrites, CI edits, MCP setup, global config writes, external tool activation, or duplicating Superpowers execution discipline.

## Route Checks

Prefer available project-owned checks in this order: typecheck, lint, focused tests, build, then optional scanners only if already configured.

## Review Focus

- Type boundaries are explicit and stable.
- React hooks, async state, and rendering behavior are correct.
- Loading, error, empty, disabled, failure, and recovery states are handled.
- Tests cover changed behavior or critical regression risk.
- Existing TypeScript, typed ESLint, React Hooks, Vitest, Testing Library, and build scripts are used when project-owned.
- Dry-run, skipped, unavailable, metadata-only, or planned quality gates are not reported as real execution.

## Completion Evidence

Report commands run, results, skipped checks, WARN output, and residual quality risk.
