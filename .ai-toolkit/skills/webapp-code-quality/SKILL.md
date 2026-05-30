---
name: webapp-code-quality
description: Use for React, TypeScript, hooks, tests, build quality, maintainability, AI-generated code risk, and safe quality-gate routing. Do not use to add dependencies, change package managers, reformat broadly, or rewrite architecture for scanner output.
---

# Webapp Code Quality

Use this as the public-safe code-quality skill for web application changes.

This skill routes quality checks through project-owned scripts first. It does not authorize dependency changes, package-manager changes, broad rewrites, CI edits, MCP setup, global config writes, or external tool activation.

## Route Checks

Prefer available project-owned checks in this order: typecheck, lint, focused tests, build, then optional scanners only if already configured.

## Review Focus

- Type boundaries are explicit and stable.
- React hooks and async state are correct.
- Loading, error, empty, disabled, and failure states are handled.
- Tests cover changed behavior or critical regression risk.
- Dry-run or metadata-only quality gates are not reported as real execution.

## Completion Evidence

Report commands run, results, skipped checks, WARN output, and residual quality risk.
