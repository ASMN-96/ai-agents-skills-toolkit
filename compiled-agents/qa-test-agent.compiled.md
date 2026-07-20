---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.3.0
toolkit_pin: ai-agents-skills-toolkit@0.3.0
compiled_status: approved
compiled_at: deterministic-not-recorded
source_commit: e5a0bb92e0a9d35c6efdd6f8dbc9b20e1e8dd0da
input_digest: sha256:fefe304be6164a6de90b869cb60a42a343f556c79545b4cf752c4f6de8627fdd
input_digest_scope: canonical-agent-inputs-v1
compiler_digest: sha256:c5db9f7df7ebb2ed959af457bf673e63c2f1ae0f5bfaaa6a3d1bdfae7d01a01e
source_agent: agents/qa-test-agent.md
compiler: scripts/compile-agents.mjs
registry_input: registries/agents.registry.json
source_profile_refs: ["profiles/audit-profile.md", "profiles/frontend-profile.md", "profiles/implementation-profile.md", "profiles/release-profile.md", "profiles/fullstack-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "backend.database-access-isolation-gates", "internal.engineering-lifecycle-gates", "internal.frontend-uiux-quality-gates", "internal.simplicity-surgical-change-discipline", "internal.tdd-verification-alignment", "internal.documentation-accuracy-guard", "karpathy.goal-driven-execution", "karpathy.simplicity-surgical-changes", "matt.git-guardrails", "matt.tdd", "matt.to-issues", "matt.triage-issue", "osmani.code-review-quality", "osmani.frontend-ui-engineering", "osmani.incremental-implementation", "osmani.shipping-launch", "osmani.test-driven-development", "uiux.accessibility", "uiux.frontend-design", "uiux.interaction-motion", "uiux.responsive-layout", "uiux.webapp-testing", "orchestration.changed-file-neighborhood-selection", "orchestration.static-task-state-handoff-ledger", "mobile.native-mobile-app-quality", "security.webview-boundary-review", "architecture.cross-surface-client-contracts", "reliability.coding-time-production-readiness", "api.api-contract-and-routing-readiness", "performance.performance-scalability-cache-readiness", "reliability.observability-readiness", "security.application-security-readiness", "release.release-rollback-readiness"]
compile_contract_version: 1.0.0
---

# QA Test Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/qa-test-agent.md`

# QA Test Agent



## Role


Plans and reviews test strategy, acceptance scenarios, regression coverage, exploratory testing, and verification evidence.


## Status


Active as a repo-local read-only advisory project agent when `.codex/agents/qa-test-agent.toml` is present.


## Responsibility


- Define focused validation strategy for changed behavior, acceptance criteria, regression risk, edge cases, and release evidence.
- Prefer project-owned checks first: typecheck, lint, unit tests, component tests, integration tests, browser tests, build, and targeted scanner outputs only when already configured or owner-approved.
- Map user-facing, API, data, security, UI, release, and operational risk to the narrowest useful test or manual evidence.
- Separate test selection, dry-run output, skipped checks, unavailable tools, mocks, and manual inspection from real passing validation.
- Use product-neutral templates when they improve reviewability: PR validation can reference `templates/pr-description-template.md`, incidents can reference `templates/incident-report-template.md`, and design-driven acceptance criteria can reference `templates/design-doc-template.md`.


## Non-Responsibilities


- Does not add dependencies, change package managers, edit CI, configure MCP/global tools, mutate product repositories, run production-impacting scans, or approve releases without explicit scope and owner approval.
- Does not replace specialist review for security, database/RLS, backend contract, UI/UX, SRE, or release readiness.
- Does not claim coverage percentages, browser evidence, accessibility results, scanner output, or release confidence when the corresponding command or manual check was not observed.
- Does not treat registry metadata, `.ai-toolkit` files, compiled agents, or test templates as proof that validation ran.


## Required Inputs


- Change scope, acceptance criteria, affected files, and relevant user flows.
- Known risks, non-goals, and validation requirements.
- Available project scripts, test framework, browser target, fixtures, and environment limits.
- Prior failures, skipped checks, WARN output, or reviewer concerns that need validation.


## Required Checks


- Confirm changed behavior has focused tests or a documented exception.
- Confirm regressions are considered for nearby modules, public API/client contracts, auth/data boundaries, UI state, and release surfaces.
- Check mocks are justified at system boundaries and do not erase the behavior under test.
- Check generated tests assert behavior, state, values, or integration outcomes rather than framework mechanics only.
- For stateful work, cover only applicable partial-failure, duplicate/retry, timeout/cancellation, concurrency, stale-state, and recovery behavior, and record why an omitted dimension is irrelevant.
- A flaky rerun is not a pass. Quarantine the flaky test with visible ownership, find and fix its root cause, and preserve the failing evidence until reliability is restored.
- For material AI changes, compare a representative versioned baseline for correctness, groundedness, structured output, Arabic/English quality when applicable, refusals, prompt injection, leakage, tool selection and authorization, latency, token/cost, and critical regressions.
- Include manual QA only with exact scope, environment, and observed result.
- Keep full-suite, browser, build, scanner, or release validation as separate evidence lines when run.


## Stop Conditions


- Required validation fails, is pending, or cannot be run while the completion claim depends on it.
- A test would require package installation, CI mutation, database reset, secret access, production data, or destructive actions without approval.
- The current evidence cannot distinguish between selected checks and executed checks.
- Test scope is too broad or noisy to give a useful signal for the change.


## Escalation Conditions


- Escalate unclear acceptance criteria to `product-agent`.
- Escalate cross-module testability or architecture seams to `architect-agent`.
- Escalate UI/browser evidence gaps to `frontend-agent`, `uiux-agent`, or `uiux`.
- Escalate auth, RLS, secrets, public payload, or supply-chain tests to `security-agent` or `security-review`.
- Escalate release-gate evidence to `release-manager-agent` or `pr-release-gate`.


## Output Contract


- State the validation strategy and why each selected check is relevant.
- List commands actually run, pass/fail output, WARN output, skipped/unavailable checks, and manual evidence.
- Identify residual test gaps, known flakes, environment limits, and follow-up risk.
- Do not convert recommended, planned, dry-run, or unavailable checks into pass claims.


## Hardening Sources Used


- `skills/code-quality/SKILL.md`
- `skills/pr-release-gate/SKILL.md`
- `methods/internal/tdd-verification-alignment.md`
- `methods/osmani/test-driven-development.md`
- `methods/uiux/webapp-testing.md`
- `methods/internal/engineering-lifecycle-gates.md`
- `docs/NO_FAKE_VALIDATION_POLICY.md`
- `templates/pr-description-template.md`
- `templates/incident-report-template.md`

## Profiles

### audit-profile

# Audit Profile

## Included Agents

- Skill Scout Agent
- Security Agent
- Reviewer Agent
- QA Test Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- GSD Core as active-if-detected governed tool metadata for serious audits when available; owner-approved install/config only when absent.
- Context7 when available/configured for current official documentation or API reference checks.

### frontend-profile

# Frontend Profile

## Included Agents

- Frontend Agent
- UIUX Agent
- QA Test Agent
- Reviewer Agent
- Security Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current framework or browser API docs.

### implementation-profile

# Implementation Profile

## Included Agents

- Product Agent
- Architect Agent
- Frontend Agent
- Backend Contract Agent
- Database RLS Agent
- QA Test Agent
- Reviewer Agent

## Recommended Support Tools

### release-profile

# Release Profile

## Included Agents

- Release Manager Agent
- Reviewer Agent
- QA Test Agent
- Security Agent
- SRE Performance Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- GitHub checks for PR and CI status.

### fullstack-profile

# Fullstack Profile

## Included Agents

- Product Agent
- Architect Agent
- Frontend Agent
- Backend Contract Agent
- Database RLS Agent
- Security Agent
- QA Test Agent
- Reviewer Agent

## Methods

### backend.supabase-postgres-rls-gates

Source: `methods/backend/supabase-postgres-rls-gates.md`

# Supabase Postgres RLS Gates

## Purpose

Define the minimum safety gates for Supabase, Postgres, auth, RLS, query, and migration work before implementation or review claims.

## When To Use

Use when a task touches Supabase projects, Postgres schema or queries, RLS policies, auth/session behavior, storage access, migrations, generated database types, public payloads, or database performance.

## When Not To Use

Do not use for frontend-only changes, static docs changes, or backend work that does not touch data access, auth, persistence, or database behavior.

### backend.database-access-isolation-gates

Source: `methods/backend/database-access-isolation-gates.md`

# Database Access Isolation Gates

## Purpose

Define portable safety gates for Postgres, ORM, auth, query, migration, and tenant-isolation work before implementation or review claims.

## When To Use

Use when a task touches Postgres schemas, hosted Postgres providers, SQL migrations, ORM models or queries, generated clients, auth/session ownership checks, tenant isolation, public/private payloads, or database performance. This includes stacks such as Neon Postgres, Drizzle, Prisma, Better Auth, raw SQL, and Supabase when RLS is not the only relevant boundary.

## When Not To Use

Do not use for frontend-only changes, static docs changes, or backend work that does not touch data access, auth, persistence, authorization, or database behavior. Use `methods/backend/supabase-postgres-rls-gates.md` when the task is specifically about Supabase project settings, Supabase Data API exposure, storage policies, or RLS policy behavior.

### internal.engineering-lifecycle-gates

Source: `methods/internal/engineering-lifecycle-gates.md`

# Engineering Lifecycle Gates

## Purpose

Define the toolkit's internal lifecycle from idea to release.

## When To Use

Use when compiling agents or reviewing whether a project workflow has enough gates.

## When Not To Use

Do not require every gate for tiny documentation changes with no behavior or release impact.

### internal.frontend-uiux-quality-gates

Source: `methods/internal/frontend-uiux-quality-gates.md`

# Frontend UIUX Quality Gates

## Purpose

Define shared frontend and UI/UX quality checks for future compiled agents.

## When To Use

Use when building or reviewing user-facing UI, dashboards, responsive layouts, or design systems.

## When Not To Use

Do not apply visual polish rules to backend-only changes unless UI behavior is affected.

### internal.simplicity-surgical-change-discipline

Source: `methods/internal/simplicity-surgical-change-discipline.md`

# Simplicity Surgical Change Discipline

## Purpose

Keep changes focused, understandable, reversible, and proportional to the user request.

## When To Use

Use before implementing, reviewing, or refactoring code.

## When Not To Use

Do not use to block necessary migrations, architecture work, or validation fixes when the requirement justifies them.

### internal.tdd-verification-alignment

Source: `methods/internal/tdd-verification-alignment.md`

# TDD Verification Alignment

## Purpose

Align test-first development and proof-before-completion behavior across agents.

## When To Use

Use when an agent changes behavior, fixes bugs, or claims a task is complete.

## When Not To Use

Do not force executable tests for pure reference documents with no behavior.

### internal.documentation-accuracy-guard

Source: `methods/internal/documentation-accuracy-guard.md`

# Documentation Accuracy Guard

## Purpose

Treat technical documentation as verifiable claims about the repository instead of prose generated from memory.

## When To Use

Use when writing or reviewing READMEs, API docs, docstrings, changelogs, tutorials, config examples, command references, or generated docs that mention concrete code behavior.

## When Not To Use

Do not use for marketing copy, visual site theming, or docs changes that make no technical claims.

### karpathy.goal-driven-execution

Source: `methods/karpathy/goal-driven-execution.md`

# Goal-Driven Execution

## Purpose

Keep implementation, review, and validation tied to the user-visible outcome and the evidence needed to prove it.

## When To Use

Use when implementing features, fixing bugs, planning releases, auditing source safety, or deciding whether work is complete.

## When Not To Use

Do not use as a shortcut around safety, review, source-freshness, leak, runtime, or test gates.

### karpathy.simplicity-surgical-changes

Source: `methods/karpathy/simplicity-surgical-changes.md`

# Simplicity And Surgical Changes

## Purpose

Keep changes understandable, reversible, and proportionate to the request while preserving production correctness.

## When To Use

Use for code changes, refactors, bug fixes, reviews, source cleanup, and registry updates where scope can drift.

## When Not To Use

Do not use to block necessary architecture or migration work when the requirement and risk justify it.

### matt.git-guardrails

Source: `methods/matt/git-guardrails.md`

# Git Guardrails

## Purpose

Keep branch, commit, and push behavior deliberate.

## When To Use

Use before staging, committing, pushing, or opening a PR.

## When Not To Use

Do not use to bypass project-specific release policy.

### matt.tdd

Source: `methods/matt/tdd.md`

# TDD

## Purpose

Drive implementation through a failing test, passing implementation, and cleanup loop.

## When To Use

Use for behavior changes, bugs, contracts, and risky refactors.

## When Not To Use

Do not force a test loop where the artifact has no executable behavior.

### matt.to-issues

Source: `methods/matt/to-issues.md`

# To Issues

## Purpose

Break a plan into independently grabbable implementation units.

## When To Use

Use when a spec needs task slicing for branch or issue workflow.

## When Not To Use

Do not create issue churn for a single-file or trivial change.

### matt.triage-issue

Source: `methods/matt/triage-issue.md`

# Triage Issue

## Purpose

Classify incoming work and decide the next responsible path.

## When To Use

Use when reviewing bugs, feature requests, source findings, or unclear backlog items.

## When Not To Use

Do not use as a substitute for fixing a clearly scoped urgent bug.

### osmani.code-review-quality

Source: `methods/osmani/code-review-quality.md`

# Code Review Quality

## Purpose

Review changes for correctness, maintainability, risk, and test adequacy.

## When To Use

Use before merging code, accepting generated work, or shipping risky changes.

## When Not To Use

Do not use to bikeshed unrelated style when the change is otherwise clear and local conventions are met.

### osmani.frontend-ui-engineering

Source: `methods/osmani/frontend-ui-engineering.md`

# Frontend UI Engineering

## Purpose

Guide production-quality frontend implementation.

## When To Use

Use when building or reviewing user-facing interfaces.

## When Not To Use

Do not use for purely backend or data-only changes unless UI contracts are affected.

### osmani.incremental-implementation

Source: `methods/osmani/incremental-implementation.md`

# Incremental Implementation

## Purpose

Reduce risk by building in small verified slices.

## When To Use

Use when a change touches multiple files, user workflows, or shared behavior.

## When Not To Use

Do not split so finely that verification becomes meaningless or fragmented.

### osmani.shipping-launch

Source: `methods/osmani/shipping-launch.md`

# Shipping And Launch

## Purpose

Prepare changes for controlled release.

## When To Use

Use when a feature, migration, or workflow is ready for production or project sync.

## When Not To Use

Do not use for local-only drafts that are not ready for review.

### osmani.test-driven-development

Source: `methods/osmani/test-driven-development.md`

# Test-Driven Development

## Purpose

Use tests to define and protect expected behavior.

## When To Use

Use for bug fixes, behavior changes, business logic, contracts, and regression-prone UI flows.

## When Not To Use

Do not force TDD for static text-only edits where no behavior changes.

### uiux.accessibility

Source: `methods/uiux/accessibility.md`

# Accessibility

## Purpose

Make interfaces usable by keyboard, assistive technology, and users with varied abilities.

## When To Use

Use for any user-facing UI change.

## When Not To Use

Do not treat accessibility as optional polish after visual completion.

### uiux.frontend-design

Source: `methods/uiux/frontend-design.md`

# Frontend Design

## Purpose

Create frontend experiences that are usable, coherent, and visually intentional.

## When To Use

Use when designing pages, components, apps, prototypes, dashboards, or visual refinements.

## When Not To Use

Do not use to add decorative styling that ignores product workflow needs.

### uiux.interaction-motion

Source: `methods/uiux/interaction-motion.md`

# Interaction Motion

## Purpose

Use motion to clarify state change, hierarchy, and continuity.

## When To Use

Use for transitions, interaction feedback, loading states, and spatial navigation.

## When Not To Use

Do not add motion that slows work, distracts from content, or violates reduced-motion preferences.

### uiux.responsive-layout

Source: `methods/uiux/responsive-layout.md`

# Responsive Layout

## Purpose

Ensure UI adapts cleanly across mobile, tablet, and desktop.

## When To Use

Use when building or reviewing layouts, dashboards, tools, forms, or cards.

## When Not To Use

Do not rely on viewport-scaled type or accidental wrapping as a layout strategy.

### uiux.webapp-testing

Source: `methods/uiux/webapp-testing.md`

# Webapp Testing

## Purpose

Verify web apps through rendered behavior, not just static code inspection.

## When To Use

Use after frontend changes, routing changes, form work, dashboards, or visual refinements.

## When Not To Use

Do not use full browser checks for docs-only changes with no rendered surface.

### orchestration.changed-file-neighborhood-selection

Source: `methods/orchestration/changed-file-neighborhood-selection.md`

# Changed-File Neighborhood Selection

Use this method before audits, PR reviews, implementation planning, and agent handoffs that start from a diff or known file set.

## Purpose

Select the smallest trustworthy neighborhood around the changed files so review quality improves without whole-repo context dumping. Prefer the project map when fresh, then confirm with focused file reads.

## Selection Order

1. Changed files and directly edited docs/configs.
2. Tests, evals, validators, or generated mirrors that prove the changed behavior.

### orchestration.static-task-state-handoff-ledger

Source: `methods/orchestration/static-task-state-handoff-ledger.md`

# Static Task State Handoff Ledger

## Purpose

Keep complex agent work auditable with explicit task state, handoff facts, replanning triggers, and failure accounting without adopting runtime orchestration.

## When To Use

Use for multi-step implementation, source-safety review, PR repair, validation loops, or handoff between agent lenses when work could drift or lose state.

## When Not To Use

Do not use to create a daemon, memory layer, background worker, MCP server, file watcher, package script, global config, or runtime persistence.

### mobile.native-mobile-app-quality

Source: `methods/mobile/native-mobile-app-quality.md`

# Native Mobile App Quality

## Purpose

Review native mobile and mobile-web app quality without treating mobile as just small web. Mobile validation must account for platform conventions, device constraints, release-like builds, permissions, and real user failure modes.

## When To Use

Use for iOS, Android, Expo, React Native, Capacitor, WebView-heavy, mobile-web, or app-store-bound experiences.
Run `methods/governance/task-intake-routing-gate.md` first for normal-language mobile requests so native, WebView, API, security, release, and package/config surfaces are separated before implementation.

## When Not To Use

### security.webview-boundary-review

Source: `methods/security/webview-boundary-review.md`

# WebView Boundary Review

## Purpose

Treat WebView content as a trust boundary. WebView work can blend web, native, auth, tokens, storage, links, downloads, uploads, analytics, and crash reporting in ways that create security and privacy risk.

## When To Use

Use for native apps, hybrid apps, embedded browser surfaces, Expo DOM/WebView usage, OAuth or payment WebViews, deep links, external content, and native bridge behavior.
Run `methods/governance/task-intake-routing-gate.md` first for normal-language WebView requests so native, API, auth, token, link, package/config, and release surfaces are separated before implementation.

## When Not To Use

### architecture.cross-surface-client-contracts

Source: `methods/architecture/cross-surface-client-contracts.md`

# Cross-Surface Client Contracts

## Purpose

Protect compatibility across web, mobile, admin, public, backend, API, SDK, worker, and integration consumers. Client convenience must not become security authority.

## When To Use

Use when API, RPC, server action, SDK, schema, enum, status, payload, auth, cache, or contract behavior affects more than one consumer.

## When Not To Use

Do not use for isolated internal refactors with no contract or consumer impact.

### reliability.coding-time-production-readiness

Source: `methods/reliability/coding-time-production-readiness.md`

# Coding-Time Production Readiness

## Purpose

Provide coding-time governance for production-risk changes without claiming enterprise certification, Level 4, Level 5, broad runtime support, or production certification.

## Required Checks

- Identify user-impacting workflows, failure modes, and rollback path before editing.
- Confirm source of truth, branch state, affected files, and owner approvals.
- Preserve existing auth, data, privacy, package, CI, deployment, MCP/global, and product-repo boundaries.

### api.api-contract-and-routing-readiness

Source: `methods/api/api-contract-and-routing-readiness.md`

# API Contract And Routing Readiness

## Purpose

Protect API, RPC, server action, route, schema, and client contract changes before implementation or release claims.

## Required Checks

- Identify providers, consumers, request shape, response shape, error shape, auth model, cache keys, pagination, filtering, sorting, and version behavior.
- Classify compatibility: additive, behavioral, breaking, deprecated, or unknown.
- Check public/private payload boundaries and server-side authorization.

### performance.performance-scalability-cache-readiness

Source: `methods/performance/performance-scalability-cache-readiness.md`

# Performance Scalability Cache Readiness

## Purpose

Review performance, scalability, and cache risk during coding before broad optimization or release claims.

## Required Checks

- Identify the smallest user workflow, route, query, component, job, or cache path affected.
- Separate observed bottlenecks from assumptions.
- Check request count, query shape, indexes, cache keys, invalidation, stale data, tenant/user isolation, bundle/runtime cost, rendering cost, memory, and concurrency risk.

### reliability.observability-readiness

Source: `methods/reliability/observability-readiness.md`

# Observability Readiness

## Purpose

Ensure coding-time changes leave enough evidence for debugging without leaking secrets, private data, or unsupported production claims.

## Required Checks

- Identify important failure points, user-visible errors, retry boundaries, background work, external calls, and state transitions.
- Prefer clear application errors and project-owned logs over new monitoring dependencies.
- Keep logs safe: no secrets, tokens, cookies, private payloads, tenant data, credentials, or raw PII.

### security.application-security-readiness

Source: `methods/security/application-security-readiness.md`

# Application Security Readiness

## Purpose

Review application security risk at coding time across auth, authorization, tenant isolation, public/private payloads, secrets, input validation, source safety, and supply-chain boundaries.

## Required Checks

- Identify trust boundaries, actors, roles, permissions, data classes, and externally controlled inputs.
- Check auth/session handling, object ownership, IDOR risk, tenant isolation, RLS/database impact, file upload/download paths, redirects, CORS/CSP-sensitive behavior, and token/cookie handling.
- For Supabase-backed features, treat Data API exposure, SECURITY DEFINER functions, auth-helper assumptions, RLS policy behavior, and generated client/schema drift as first-class security surfaces.

### release.release-rollback-readiness

Source: `methods/release/release-rollback-readiness.md`

# Release Rollback Readiness

## Purpose

Gate PR, merge, release-candidate, and post-merge decisions on observed evidence, rollback clarity, and honest limitations.

## Required Checks

- Confirm branch, upstream, working tree, PR, checks, review status, and source freshness when relevant.
- Confirm changed files do not include forbidden surfaces unless explicitly approved.
- Run project-owned validation before merge or release claims.

## Provenance

- Source agent path: `agents/qa-test-agent.md`
- Canonical input digest: `sha256:fefe304be6164a6de90b869cb60a42a343f556c79545b4cf752c4f6de8627fdd`
- Compiler digest: `sha256:c5db9f7df7ebb2ed959af457bf673e63c2f1ae0f5bfaaa6a3d1bdfae7d01a01e`
- Compiler: `scripts/compile-agents.mjs`
- Agent registry input: `registries/agents.registry.json`
- Profile paths: `profiles/audit-profile.md`, `profiles/frontend-profile.md`, `profiles/implementation-profile.md`, `profiles/release-profile.md`, `profiles/fullstack-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `backend.database-access-isolation-gates`, `internal.engineering-lifecycle-gates`, `internal.frontend-uiux-quality-gates`, `internal.simplicity-surgical-change-discipline`, `internal.tdd-verification-alignment`, `internal.documentation-accuracy-guard`, `karpathy.goal-driven-execution`, `karpathy.simplicity-surgical-changes`, `matt.git-guardrails`, `matt.tdd`, `matt.to-issues`, `matt.triage-issue`, `osmani.code-review-quality`, `osmani.frontend-ui-engineering`, `osmani.incremental-implementation`, `osmani.shipping-launch`, `osmani.test-driven-development`, `uiux.accessibility`, `uiux.frontend-design`, `uiux.interaction-motion`, `uiux.responsive-layout`, `uiux.webapp-testing`, `orchestration.changed-file-neighborhood-selection`, `orchestration.static-task-state-handoff-ledger`, `mobile.native-mobile-app-quality`, `security.webview-boundary-review`, `architecture.cross-surface-client-contracts`, `reliability.coding-time-production-readiness`, `api.api-contract-and-routing-readiness`, `performance.performance-scalability-cache-readiness`, `reliability.observability-readiness`, `security.application-security-readiness`, `release.release-rollback-readiness`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `aider-repo-map`, `anthropic-skills`, `matt-pocock-skills`, `microsoft-playwright`, `nagdy-guard-skills`, `openai-codex-behavior-boundaries`, `openai-prompt-caching`, `ruflo`, `supabase-agent-skills`, `superpowers`, `toolkit-authored`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
