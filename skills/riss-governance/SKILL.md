---
name: riss-governance
description: Use when doing serious RISS work that needs repo governance, source-of-truth checks, task routing, dependency-chain safety, branch/PR/CI/CodeRabbit discipline, Supabase/backend/security caution, UI/runtime validation, or completion verification.
---

# RISS Governance

## Core Rule

For serious RISS work, verify the source of truth, route narrowly, make small reversible changes, protect dependency chains, and validate before claiming completion.

## Start Every Task By Stating

- Selected agents.
- Selected profile, if any.
- Selected support tools.
- Mode: read-only, plan, implementation, or review.
- Scope.
- Do-not-touch list.
- Validation plan.

Use the minimum agents and tools required. Do not activate every agent, profile, plugin, or support tool by default.

If a recommended agent, tool, or profile is not installed or not available in the target project, stop and report it clearly. Do not silently fall back to another agent or tool. Ask the user whether to continue with a specific closest available alternative, install or sync the missing agent/tool first, or stop the task. Only continue after the user chooses.

## Source Of Truth

- Treat GitHub `origin/main` or the explicit target branch as authoritative.
- Check local branch, remote, upstream, and working tree status before review, planning, or implementation when current truth matters.
- If local state is dirty, stale, divergent, detached, has no upstream, or remote cannot be verified, report it before acting.
- Do not claim conclusions from local state alone when remote verification is required.
- State assumptions instead of hiding uncertainty.
- Do not silently choose between interpretations that change behavior.

## Routing

- Source, skill, or tool safety: Skill Scout Agent + Reviewer Agent.
- Frontend, runtime, or UI behavior: Frontend Agent + QA/Test Agent + Reviewer Agent.
- UI/UX quality: UIUX Agent + Frontend Agent + Reviewer Agent.
- Backend, API, Supabase, RLS, or database: Backend Contract Agent + Database/RLS Agent + Security Agent + Reviewer Agent.
- Security, privacy, PII, or public payloads: Security Agent + Database/RLS Agent + Reviewer Agent.
- SRE, load, stability, or release operations: SRE Performance Agent if installed; otherwise stop and ask before using Security Agent + Release Manager Agent + Reviewer Agent as the closest available alternative.
- PR, merge, or release closure: Release Manager Agent + Reviewer Agent + QA/Test Agent.

## Support Tools

Use support tools only when the task requires them:

- Superpowers for systematic debugging, TDD, code review, verification-before-completion, and plan discipline.
- GSD for long multi-phase work, release gates, state, roadmap, and phase planning if configured.
- Context7 for current external library, framework, or API docs.
- Playwright or browser tools for Viewer/Dashboard runtime UI, route, browser, cache, and interaction verification.
- Supabase docs/tooling for database, RLS, Edge Functions, storage, realtime, generated types, and public/private contracts.
- GitHub/gh for baseline, branches, PR status, checks, CodeRabbit, and merge verification.
- Web search/browser for up-to-date external facts or docs.
- Figma only when an approved design or design-system source exists.

## Engineering Discipline

- Keep changes small, focused, reviewable, and reversible.
- Fix root causes rather than symptoms.
- Avoid wrappers, adapters, parallel workaround layers, flags, or future-proofing unless required and justified.
- Prefer readable names, small functions, explicit contracts, and existing patterns.
- Add comments only for why, risk, business constraints, or non-obvious dependencies.
- Do not reformat, rewrite, delete, or move unrelated code.
- Treat security as part of design, implementation, validation, and release.
- For operational or release work, include observability, runbook, and recovery thinking.

## Dependency-Chain Safety

If changing a shared hook, type, utility, API contract, schema, public contract, route, state store, analytics path, publish path, or reused UI component:

- Audit known consumers before claiming completion.
- Preserve existing working flows unless the task explicitly changes them.
- Do not fix one chain while silently breaking another.
- When a dependency changes, update required dependent flows or stop and report the blocker.

## Backend, Database, And Security Safety

Treat backend, database, RLS, migrations, Edge Functions, auth, storage, realtime, analytics, and public/private payload changes as high risk.

- Verify source of truth and impact before changing behavior.
- Include rollback or revert thinking.
- For Supabase work, check migrations, generated types, RLS/policies, functions/RPCs, storage policies, realtime behavior, and frontend consumers when relevant.
- Never weaken authorization, public contract safety, or data isolation to pass a test.

## UI And Runtime Safety

- Preserve existing UI behavior, loading, error, empty states, responsive behavior, accessibility, and buyer/user flows unless explicitly changed.
- Runtime issues found in manual QA reopen the issue even if static review passed.
- Use Playwright/browser evidence when runtime behavior matters.

## PR And Release Governance

- No direct push to `main`.
- Use branch -> PR -> CI/checks -> CodeRabbit -> merge only when green or explicitly non-blocking.
- If CodeRabbit or checks have required comments/failures, fix only scoped required issues.
- Do not merge with pending checks or unresolved required review comments.
- Use squash or the repo's standard merge method.

## Risk Classification

Classify findings as one of:

- P0 release blocker.
- P1 release blocker.
- P2 important before QA/launch.
- P3 hardening/defer.
- Manual QA required.
- No action.

## Stop Conditions

Stop and report instead of guessing when:

- Remote baseline cannot be verified.
- Repo state is dirty, stale, divergent, detached, or missing upstream and the task depends on current truth.
- The requested fix crosses module or ownership boundaries unexpectedly.
- Dependency-chain impact is unclear.
- Backend, security, or public-data risk is detected.
- Multiple valid interpretations exist and the choice changes behavior.
- Required validation cannot be run.

## Completion Report

Before claiming completion, state:

- Remote baseline used.
- Files changed.
- Why each change was in scope.
- Dependency-chain impact checked.
- Validation commands/tests run.
- Remaining manual QA.
- Risks or deferred items.
- PR, CodeRabbit, and check status if applicable.
