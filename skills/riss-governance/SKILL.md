---
name: riss-governance
description: Use when doing serious RISS work that needs repo governance, source-of-truth checks, task routing, dependency-chain safety, branch/PR/CI/CodeRabbit discipline, Supabase/backend/security caution, UI/runtime validation, or completion verification.
---

# RISS Governance

## Core Rule

For serious RISS work, verify the source of truth, route narrowly, track phase/state explicitly, make small reversible changes, protect dependency chains, and validate before claiming completion.

This skill is the governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. Do not apply it automatically to unrelated projects unless the user explicitly requests it.

GSD and Superpowers are both core governance layers when available:

- GSD is core for serious multi-step work, audits, backend work, migrations, security/SRE audits, release programs, and phase/state/roadmap/release-gate tracking.
- Superpowers is core execution discipline for systematic debugging, TDD, code review, and verification-before-completion.
- Treat GSD as an external prerequisite/support tool, not a vendored toolkit dependency.

## Start Every Task By Stating

- GSD phase/state usage.
- Selected agents.
- Native custom-agent availability or compiled-agent fallback status.
- Selected profile, if any.
- Selected support tools.
- Mode: read-only, plan, implementation, or review.
- Scope.
- Do-not-touch list.
- Validation plan.

Use the minimum agents and tools required. Do not activate every agent, profile, plugin, or support tool by default.

For Phase 10 governance-spine work, consult repo registries and policy docs when useful instead of expanding this skill inline:

- `registries/*.json` for existing asset and routing metadata.
- `docs/GOVERNANCE_SPINE.md` for the plain-language routing contract.
- `docs/REGISTRY_CONTRACT.md` for status semantics.
- `docs/TOKEN_EFFICIENCY_POLICY.md` for concise/standard/detailed output modes.
- `docs/MISSING_SKILL_DISCOVERY_POLICY.md` for read-only missing-capability discovery.

Start with a short routing summary by default. Expand only for high-risk work, missing capability, source-of-truth uncertainty, or explicit user request.

If a recommended agent, tool, or profile is not installed or not available in the target project, stop and report it clearly. Do not silently fall back to another agent or tool. Ask the user whether to continue with a specific closest available alternative, install or sync the missing agent/tool first, or stop the task. Only continue after the user chooses.

For serious multi-phase work, do not silently continue without GSD. If GSD is unavailable, stop and ask whether to install or configure GSD, continue with manual phase tracking, or stop the task.

## Source Of Truth

- Treat GitHub `origin/main` or the explicit target branch as authoritative.
- Check local branch, remote, upstream, and working tree status before review, planning, or implementation when current truth matters.
- If local state is dirty, stale, divergent, detached, has no upstream, or remote cannot be verified, report it before acting.
- Do not claim conclusions from local state alone when remote verification is required.
- State assumptions instead of hiding uncertainty.
- Do not silently choose between interpretations that change behavior.

## Routing

Select the minimum necessary agents automatically from the task. Prefer native Codex custom agents when they are available and verified. Until runtime verification passes, treat global custom agents as registered but requiring Codex restart/new session verification.

- Global entrypoint: when the user says "Use riss-governance," start with this skill, then use `riss-governance-agent` as the router when it is runtime-visible.
- Native custom agent preferred: spawn the matching toolkit custom agent by name when available.
- Fallback path: if native spawn is unavailable or fails, report the failed agent and reason. For high-risk tasks, stop and ask before fallback. For explicitly pre-approved fallback tasks, use built-in `worker` or `explorer` with the matching compiled-agent instructions.
- Never silently substitute a different agent or downgrade from native custom agent to compiled-agent fallback.
- Stop if both the native custom agent and matching compiled-agent fallback are unavailable.

- Source, skill, or tool safety: Skill Scout Agent + Reviewer Agent.
- Frontend, runtime, or UI behavior: Frontend Agent + QA/Test Agent + Reviewer Agent.
- UI/UX quality: UIUX Agent + Frontend Agent + Reviewer Agent.
- Backend, API, Supabase, RLS, or database: Backend Contract Agent + Database/RLS Agent + Security Agent + Reviewer Agent.
- Security, privacy, PII, or public payloads: Security Agent + Database/RLS Agent + Reviewer Agent.
- SRE, load, stability, or release operations: SRE Performance Agent if installed; otherwise stop and ask before using Security Agent + Release Manager Agent + Reviewer Agent as the closest available alternative.
- PR, merge, or release closure: Release Manager Agent + Reviewer Agent + QA/Test Agent.

## Support Tools

Use support tools only when the task requires them:

- GSD for phase/state/roadmap/release-gate tracking in serious multi-step work, audits, backend work, migrations, security/SRE audits, and release programs.
- Superpowers for systematic debugging, TDD, code review, verification-before-completion, and plan discipline.
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
- GSD is required for serious multi-phase work but is unavailable and the user has not chosen a fallback.

## Completion Report

Before claiming completion, state:

- Remote baseline used.
- GSD phase/state usage or approved manual tracking fallback.
- Native custom agents used, or fallback path used with approval/status.
- Files changed.
- Why each change was in scope.
- Dependency-chain impact checked.
- Validation commands/tests run.
- Remaining manual QA.
- Risks or deferred items.
- PR, CodeRabbit, and check status if applicable.
