---
name: riss-governance
description: Use when doing serious RISS work, or when explicitly invoked as an opt-in governance layer for a serious project thread, that needs repo governance, source-of-truth checks, task routing, dependency-chain safety, branch/PR/CI/CodeRabbit discipline, Supabase/backend/security caution, UI/runtime validation, or completion verification.
---

# RISS Governance

## Core Rule

For serious governed work, verify the source of truth, route narrowly, track phase/state explicitly, make small reversible changes, protect dependency chains, and validate before claiming completion.

This skill is the governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. Do not apply it automatically to unrelated projects unless the user explicitly invokes it.

## Explicit Opt-In Governance Mode

RISS, RISS V2, AI Toolkit, VD projects, Supabase/backend, security, release, and repo-governance work remain the primary domain.

Other repositories and projects are allowed only when the user explicitly invokes `Use riss-governance`. Explicit invocation makes this skill the active governance layer for that thread or task, within the selected mode, repo scope, runtime permissions, and user-approved boundaries.

Explicit invocation authorizes routing, planning, read-only checks, capability selection, agent/tool recommendations, and validation gates. It does not authorize writes, migrations, package or dependency changes, Supabase policy/RLS changes, auth changes, billing changes, deployment or release changes, global Codex config changes, external installs, or broad plugin/tool use. Those actions still require explicit approval, scoped execution mode, and normal runtime permissions.

Outside the primary domain, do not infer governance opt-in from vague quality language alone. If the user does not explicitly invoke `Use riss-governance`, unrelated projects should proceed under normal Codex behavior unless another active instruction requires this skill.

## Permission Matrix

| Request or mode | Permission granted |
| --- | --- |
| `Use riss-governance` | Authorizes routing, planning, read-only checks, capability selection, and validation gates only. It does not authorize writes by itself. |
| `Mode: read-only` | No writes. Inspect, audit, summarize, and recommend only. |
| `Mode: planning` | No writes unless separately approved. Produce plans, specs, risk reviews, and validation strategy only. |
| `Mode: controlled implementation` | Allows only the explicitly approved scope. Stop before migrations, package changes, Supabase policy/RLS changes, auth/billing/deployment changes, global config changes, external installs, or broad plugin/tool use unless separately approved. |
| Native sub-agent spawning | Requires runtime permission and explicit delegation, sub-agent, or parallel-agent authorization. |
| Spawning not authorized or blocked | Use inline agent lenses and report the limitation. Never pretend a spawned agent ran. |

GSD and Superpowers are both core governance layers when available:

- GSD is core for serious multi-step work, audits, backend work, migrations, security/SRE audits, release programs, and phase/state/roadmap/release-gate tracking.
- Superpowers is core execution discipline for systematic debugging, TDD, code review, and verification-before-completion.
- Treat GSD as an external prerequisite/support tool, not a vendored toolkit dependency.

## Start Every Task By Stating

- GSD phase/state usage.
- Selected agents, including whether they are only inline lenses or authorized sub-agents.
- Native custom-agent availability, sub-agent spawn authorization, or compiled-agent fallback status.
- Selected profile, if any.
- Selected support tools and invocation status when relevant, such as "available, not invoked."
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

## Response Budget

Default to concise output. Do not paste full policies, registries, docs, compiled agents, checklists, or source records unless the user explicitly asks for the full text or high-risk evidence requires a specific excerpt.

Default output shape: decision, intent, risk, route, tools, stop conditions, and next safe action.

- Low-risk tasks: one short routing line, scoped action, and validation note.
- Standard tasks: selected profile, agents/helpers, tools, stop conditions, and validation plan.
- High-risk tasks: include the evidence needed for safety, but summarize stable policy and link or cite files instead of dumping them.

## Plain-Language Intent Translation

Users do not need to know internal agent, profile, skill, or tool names. Translate normal language into technical routing:

- "Make it safer" or "before this goes live" means review security, release, validation, and rollback risk.
- "The dashboard is slow" means scope frontend runtime performance first, then backend only if evidence points there.
- "Make this easier to use" or "feel more premium" means route UI/UX quality without assuming a redesign.
- "Check the PR comments" means triage required vs optional review comments, checks, and merge blockers.
- "Do this professionally" means clarify success criteria, protect existing behavior, and select the smallest useful validation path.

Ask only when multiple interpretations would change behavior, scope, data exposure, or validation requirements.

## Internal Helper Skills

`riss-agent-governance` and `riss-skill-governance` are internal helpers only. Keep `riss-governance` as the normal user-facing entrypoint.

- Use `riss-agent-governance` internally for agent selection, native/fallback status, handoff checks, and no-silent-fallback enforcement.
- Use `riss-skill-governance` internally for skill selection, trigger conflicts, missing-skill preflight, and skill safety boundaries.
- If a user directly asks to call either helper, redirect the request through `riss-governance` and do not treat the helper as a public entrypoint.
- If a named helper is unavailable in a runtime where it is needed, refuse direct use and report the missing helper status instead of pretending it ran.

Select an extra skill only when it materially improves context, safety, validation, or quality. Do not add extra skills for low-risk typo edits, direct explanations, or cases where file inspection is enough.

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

Select the minimum necessary agents automatically from the task and report them. Agent selection is governance routing; spawning a sub-agent is a separate runtime action. Prefer native Codex custom agents when they are available, verified, allowed by runtime rules, and the user has explicitly authorized delegation, sub-agents, or parallel agent work. Until runtime verification passes, treat global custom agents as registered but requiring Codex restart/new session verification.

- Global entrypoint: when the user says "Use riss-governance," start with this skill, then use `riss-governance-agent` as the router when it is runtime-visible.
- Native custom agent preferred: spawn the matching toolkit custom agent by name only when runtime rules allow it and the user explicitly authorizes delegation, sub-agents, or parallel agent work.
- Inline agent lenses: if spawning is not allowed or not authorized, proceed inline using the selected agent lenses and report that no sub-agent ran.
- Fallback path: if spawning is authorized but native spawn is unavailable or fails, report the failed agent and reason. For high-risk tasks, stop and ask before fallback. For explicitly pre-approved fallback tasks, use built-in `worker` or `explorer` with the matching compiled-agent instructions.
- Never silently substitute a different agent or downgrade from native custom agent to compiled-agent fallback.
- Never pretend a spawned agent ran. Report selected agents separately from agents actually spawned.
- Stop if both the native custom agent and matching compiled-agent fallback are unavailable.

- Source, skill, or tool safety: Skill Scout Agent + Reviewer Agent.
- Frontend, runtime, or UI behavior: Frontend Agent + QA/Test Agent + Reviewer Agent.
- UI/UX quality: UIUX Agent + Frontend Agent + Reviewer Agent.
- Backend, API, Supabase, RLS, or database: Backend Contract Agent + Database/RLS Agent + Security Agent + Reviewer Agent.
- Security, privacy, PII, or public payloads: Security Agent + Database/RLS Agent + Reviewer Agent.
- SRE, load, stability, or release operations: SRE Performance Agent if installed; otherwise stop and ask before using Security Agent + Release Manager Agent + Reviewer Agent as the closest available alternative.
- PR, merge, or release closure: Release Manager Agent + Reviewer Agent + QA/Test Agent.

## Support Tools

Use support tools only when the task requires them. Selecting a support tool is not the same as invoking it; physical invocation must respect the selected mode, runtime availability, tool permissions, and user-approved boundaries. When a relevant tool is available but not invoked, report "available, not invoked" if that status affects the task.

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
- Selected inline agent lenses and any sub-agents actually spawned.
- Files changed.
- Why each change was in scope.
- Dependency-chain impact checked.
- Validation commands/tests run.
- Remaining manual QA.
- Risks or deferred items.
- PR, CodeRabbit, and check status if applicable.
