---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.2.0
toolkit_pin: ai-agents-skills-toolkit@0.2.0
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/qa-test-agent.md
source_profile_refs: ["profiles/audit-profile.md", "profiles/frontend-profile.md", "profiles/implementation-profile.md", "profiles/release-profile.md", "profiles/fullstack-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "internal.engineering-lifecycle-gates", "internal.frontend-uiux-quality-gates", "internal.simplicity-surgical-change-discipline", "internal.tdd-verification-alignment", "karpathy.goal-driven-execution", "karpathy.simplicity-surgical-changes", "matt.git-guardrails", "matt.tdd", "matt.to-issues", "matt.triage-issue", "osmani.code-review-quality", "osmani.frontend-ui-engineering", "osmani.incremental-implementation", "osmani.shipping-launch", "osmani.test-driven-development", "uiux.accessibility", "uiux.frontend-design", "uiux.interaction-motion", "uiux.responsive-layout", "uiux.webapp-testing", "orchestration.changed-file-neighborhood-selection", "mobile.native-mobile-app-quality", "security.webview-boundary-review", "architecture.cross-surface-client-contracts", "reliability.coding-time-production-readiness", "api.api-contract-and-routing-readiness", "performance.performance-scalability-cache-readiness", "reliability.observability-readiness", "security.application-security-readiness", "release.release-rollback-readiness"]
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
Stub. This agent will be compiled later from approved methods and project profiles.

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
- Context7 when available/configured for current official documentation or API reference checks.
## Default Mode

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
## Agent Roles That Should Embed It
Backend Contract Agent, Database RLS Agent, Security Agent, QA Test Agent, Reviewer Agent.
## Operating Rules

### internal.engineering-lifecycle-gates

Source: `methods/internal/engineering-lifecycle-gates.md`

# Engineering Lifecycle Gates
## Purpose
Define the toolkit's internal lifecycle from idea to release.
## When To Use
Use when compiling agents or reviewing whether a project workflow has enough gates.
## When Not To Use
Do not require every gate for tiny documentation changes with no behavior or release impact.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, QA Test Agent, Reviewer Agent, Release Manager Agent.
## Operating Rules

### internal.frontend-uiux-quality-gates

Source: `methods/internal/frontend-uiux-quality-gates.md`

# Frontend UIUX Quality Gates
## Purpose
Define shared frontend and UI/UX quality checks for future compiled agents.
## When To Use
Use when building or reviewing user-facing UI, dashboards, responsive layouts, or design systems.
## When Not To Use
Do not apply visual polish rules to backend-only changes unless UI behavior is affected.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, QA Test Agent, Reviewer Agent.
## Operating Rules

### internal.simplicity-surgical-change-discipline

Source: `methods/internal/simplicity-surgical-change-discipline.md`

# Simplicity Surgical Change Discipline
## Purpose
Keep agent changes focused, understandable, and proportional to the user request.
## When To Use
Use before implementing, reviewing, or refactoring code.
## When Not To Use
Do not use to block necessary migrations or architecture work when the requirement justifies it.
## Agent Roles That Should Embed It
Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.
## Operating Rules

### internal.tdd-verification-alignment

Source: `methods/internal/tdd-verification-alignment.md`

# TDD Verification Alignment
## Purpose
Align test-first development and proof-before-completion behavior across agents.
## When To Use
Use when an agent changes behavior, fixes bugs, or claims a task is complete.
## When Not To Use
Do not force executable tests for pure reference documents with no behavior.
## Agent Roles That Should Embed It
QA Test Agent, Reviewer Agent, Backend Contract Agent, Frontend Agent.
## Operating Rules

### karpathy.goal-driven-execution

Source: `methods/karpathy/goal-driven-execution.md`

# Goal-Driven Execution
## Purpose
Keep agent work tied to the user goal and measurable success criteria.
## When To Use
Use when implementing features, fixing bugs, planning releases, or verifying outcomes.
## When Not To Use
Do not use as a shortcut around safety, review, or test gates.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, QA Test Agent, Release Manager Agent, Reviewer Agent.
## Operating Rules

### karpathy.simplicity-surgical-changes

Source: `methods/karpathy/simplicity-surgical-changes.md`

# Simplicity And Surgical Changes
## Purpose
Keep agent edits small, direct, and proportionate.
## When To Use
Use for code changes, refactors, bug fixes, and reviews where scope can drift.
## When Not To Use
Do not use to block necessary architecture work when complexity is justified by clear requirements.
## Agent Roles That Should Embed It
Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.
## Operating Rules

### matt.git-guardrails

Source: `methods/matt/git-guardrails.md`

# Git Guardrails
## Purpose
Keep branch, commit, and push behavior deliberate.
## When To Use
Use before staging, committing, pushing, or opening a PR.
## When Not To Use
Do not use to bypass project-specific release policy.
## Agent Roles That Should Embed It
Release Manager Agent, Reviewer Agent, QA Test Agent.
## Operating Rules

### matt.tdd

Source: `methods/matt/tdd.md`

# TDD
## Purpose
Drive implementation through a failing test, passing implementation, and cleanup loop.
## When To Use
Use for behavior changes, bugs, contracts, and risky refactors.
## When Not To Use
Do not force a test loop where the artifact has no executable behavior.
## Agent Roles That Should Embed It
QA Test Agent, Backend Contract Agent, Frontend Agent, Reviewer Agent.
## Operating Rules

### matt.to-issues

Source: `methods/matt/to-issues.md`

# To Issues
## Purpose
Break a plan into independently grabbable implementation units.
## When To Use
Use when a spec needs task slicing for branch or issue workflow.
## When Not To Use
Do not create issue churn for a single-file or trivial change.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, Release Manager Agent, QA Test Agent.
## Operating Rules

### matt.triage-issue

Source: `methods/matt/triage-issue.md`

# Triage Issue
## Purpose
Classify incoming work and decide the next responsible path.
## When To Use
Use when reviewing bugs, feature requests, source findings, or unclear backlog items.
## When Not To Use
Do not use as a substitute for fixing a clearly scoped urgent bug.
## Agent Roles That Should Embed It
Product Agent, QA Test Agent, Reviewer Agent, Release Manager Agent.
## Operating Rules

### osmani.code-review-quality

Source: `methods/osmani/code-review-quality.md`

# Code Review Quality
## Purpose
Review changes for correctness, maintainability, risk, and test adequacy.
## When To Use
Use before merging code, accepting generated work, or shipping risky changes.
## When Not To Use
Do not use to bikeshed unrelated style when the change is otherwise clear and local conventions are met.
## Agent Roles That Should Embed It
Reviewer Agent, Security Agent, QA Test Agent, Architect Agent.
## Operating Rules

### osmani.frontend-ui-engineering

Source: `methods/osmani/frontend-ui-engineering.md`

# Frontend UI Engineering
## Purpose
Guide production-quality frontend implementation.
## When To Use
Use when building or reviewing user-facing interfaces.
## When Not To Use
Do not use for purely backend or data-only changes unless UI contracts are affected.
## Agent Roles That Should Embed It
Frontend Agent, UIUX Agent, QA Test Agent, Reviewer Agent.
## Operating Rules

### osmani.incremental-implementation

Source: `methods/osmani/incremental-implementation.md`

# Incremental Implementation
## Purpose
Reduce risk by building in small verified slices.
## When To Use
Use when a change touches multiple files, user workflows, or shared behavior.
## When Not To Use
Do not split so finely that verification becomes meaningless or fragmented.
## Agent Roles That Should Embed It
Frontend Agent, Backend Contract Agent, Database RLS Agent, QA Test Agent.
## Operating Rules

### osmani.shipping-launch

Source: `methods/osmani/shipping-launch.md`

# Shipping And Launch
## Purpose
Prepare changes for controlled release.
## When To Use
Use when a feature, migration, or workflow is ready for production or project sync.
## When Not To Use
Do not use for local-only drafts that are not ready for review.
## Agent Roles That Should Embed It
Release Manager Agent, SRE Performance Agent, QA Test Agent, Reviewer Agent.
## Operating Rules

### osmani.test-driven-development

Source: `methods/osmani/test-driven-development.md`

# Test-Driven Development
## Purpose
Use tests to define and protect expected behavior.
## When To Use
Use for bug fixes, behavior changes, business logic, contracts, and regression-prone UI flows.
## When Not To Use
Do not force TDD for static text-only edits where no behavior changes.
## Agent Roles That Should Embed It
QA Test Agent, Backend Contract Agent, Frontend Agent, Reviewer Agent.
## Operating Rules

### uiux.accessibility

Source: `methods/uiux/accessibility.md`

# Accessibility
## Purpose
Make interfaces usable by keyboard, assistive technology, and users with varied abilities.
## When To Use
Use for any user-facing UI change.
## When Not To Use
Do not treat accessibility as optional polish after visual completion.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, QA Test Agent, Reviewer Agent.
## Operating Rules

### uiux.frontend-design

Source: `methods/uiux/frontend-design.md`

# Frontend Design
## Purpose
Create frontend experiences that are usable, coherent, and visually intentional.
## When To Use
Use when designing pages, components, apps, prototypes, dashboards, or visual refinements.
## When Not To Use
Do not use to add decorative styling that ignores product workflow needs.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, Reviewer Agent, QA Test Agent.
## Operating Rules

### uiux.interaction-motion

Source: `methods/uiux/interaction-motion.md`

# Interaction Motion
## Purpose
Use motion to clarify state change, hierarchy, and continuity.
## When To Use
Use for transitions, interaction feedback, loading states, and spatial navigation.
## When Not To Use
Do not add motion that slows work, distracts from content, or violates reduced-motion preferences.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, QA Test Agent.
## Operating Rules

### uiux.responsive-layout

Source: `methods/uiux/responsive-layout.md`

# Responsive Layout
## Purpose
Ensure UI adapts cleanly across mobile, tablet, and desktop.
## When To Use
Use when building or reviewing layouts, dashboards, tools, forms, or cards.
## When Not To Use
Do not rely on viewport-scaled type or accidental wrapping as a layout strategy.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, QA Test Agent.
## Operating Rules

### uiux.webapp-testing

Source: `methods/uiux/webapp-testing.md`

# Webapp Testing
## Purpose
Verify web apps through rendered behavior, not just static code inspection.
## When To Use
Use after frontend changes, routing changes, form work, dashboards, or visual refinements.
## When Not To Use
Do not use full browser checks for docs-only changes with no rendered surface.
## Agent Roles That Should Embed It
QA Test Agent, Frontend Agent, UIUX Agent, Reviewer Agent.
## Operating Rules

### orchestration.changed-file-neighborhood-selection

Source: `methods/orchestration/changed-file-neighborhood-selection.md`

# Changed-File Neighborhood Selection
Use this method before audits, PR reviews, implementation planning, and agent handoffs that start from a diff or known file set.
## Purpose
Select the smallest trustworthy neighborhood around the changed files so review quality improves without whole-repo context dumping.
## Selection Order
1. Changed files and directly edited docs/configs.
2. Tests, evals, validators, or generated mirrors that prove the changed behavior.
3. Direct import/export neighbors and shared contracts.
4. Referenced methods, skills, profiles, and source records.
5. Release, security, or public/private boundary docs only when the change crosses those gates.

### mobile.native-mobile-app-quality

Source: `methods/mobile/native-mobile-app-quality.md`

# Native Mobile App Quality
## Purpose
Review native mobile and mobile-web app quality without treating mobile as just small web. Mobile validation must account for platform conventions, device constraints, release-like builds, permissions, and real user failure modes.
## When To Use
Use for iOS, Android, Expo, React Native, Capacitor, WebView-heavy, mobile-web, or app-store-bound experiences.
Run `methods/governance/task-intake-routing-gate.md` first for normal-language mobile requests so native, WebView, API, security, release, and package/config surfaces are separated before implementation.
## When Not To Use
Do not use for backend-only, desktop-only, or docs-only work unless mobile consumers are affected.
## Required Review Areas
- iOS and Android platform expectations, navigation conventions, permission UX, gestures, status surfaces, and store-critical behavior.

### security.webview-boundary-review

Source: `methods/security/webview-boundary-review.md`

# WebView Boundary Review
## Purpose
Treat WebView content as a trust boundary. WebView work can blend web, native, auth, tokens, storage, links, downloads, uploads, analytics, and crash reporting in ways that create security and privacy risk.
## When To Use
Use for native apps, hybrid apps, embedded browser surfaces, Expo DOM/WebView usage, OAuth or payment WebViews, deep links, external content, and native bridge behavior.
Run `methods/governance/task-intake-routing-gate.md` first for normal-language WebView requests so native, API, auth, token, link, package/config, and release surfaces are separated before implementation.
## When Not To Use
Do not use for ordinary browser-only pages with no native shell, bridge, or embedded context.
## Required Checks
- Allowed domains and allowlist policy.

### architecture.cross-surface-client-contracts

Source: `methods/architecture/cross-surface-client-contracts.md`

# Cross-Surface Client Contracts
## Purpose
Protect compatibility across web, mobile, admin, public, backend, API, SDK, worker, and integration consumers. Client convenience must not become security authority.
## When To Use
Use when API, RPC, server action, SDK, schema, enum, status, payload, auth, cache, or contract behavior affects more than one consumer.
## When Not To Use
Do not use for isolated internal refactors with no contract or consumer impact.
## Required Checks
- Identify all consumers: web, mobile, admin, public, backend jobs, third-party integrations, tests, docs, and generated clients.
- Request/response compatibility: required fields, optional fields, nullability, defaults, pagination, filtering, sorting, and error shape.

### reliability.coding-time-production-readiness

Source: `methods/reliability/coding-time-production-readiness.md`

# Coding-Time Production Readiness
## Purpose
Provide coding-time governance for production-risk changes without claiming enterprise certification, Level 4, Level 5, broad runtime support, or production certification.
## Required Checks
- Identify user-impacting workflows, failure modes, and rollback path before editing.
- Confirm source of truth, branch state, affected files, and owner approvals.
- Preserve existing auth, data, privacy, package, CI, deployment, MCP/global, and product-repo boundaries.
- Prefer project-owned typecheck, lint, test, build, browser, scanner, and release scripts before proposing new tools.
- Keep recommended tools separate from executed tools.
- State dry-run, skipped, unavailable, metadata-only, planned, and partial checks honestly.

### api.api-contract-and-routing-readiness

Source: `methods/api/api-contract-and-routing-readiness.md`

# API Contract And Routing Readiness
## Purpose
Protect API, RPC, server action, route, schema, and client contract changes before implementation or release claims.
## Required Checks
- Identify providers, consumers, request shape, response shape, error shape, auth model, cache keys, pagination, filtering, sorting, and version behavior.
- Classify compatibility: additive, behavioral, breaking, deprecated, or unknown.
- Check public/private payload boundaries and server-side authorization.
- Confirm route ownership, middleware, redirects, deep links, WebView/native clients, generated types, fixtures, and docs where relevant.
- Prefer existing contract tests, integration tests, typecheck, lint, and build commands before adding tooling.
## Evidence Requirements

### performance.performance-scalability-cache-readiness

Source: `methods/performance/performance-scalability-cache-readiness.md`

# Performance Scalability Cache Readiness
## Purpose
Review performance, scalability, and cache risk during coding before broad optimization or release claims.
## Required Checks
- Identify the smallest user workflow, route, query, component, job, or cache path affected.
- Separate observed bottlenecks from assumptions.
- Check request count, query shape, indexes, cache keys, invalidation, stale data, tenant/user isolation, bundle/runtime cost, rendering cost, memory, and concurrency risk.
- Prefer existing profiler, benchmark, test, browser, query, build, and log evidence when available.
- Avoid premature rewrites unless measured risk or clear complexity justifies it.
## Evidence Requirements

### reliability.observability-readiness

Source: `methods/reliability/observability-readiness.md`

# Observability Readiness
## Purpose
Ensure coding-time changes leave enough evidence for debugging without leaking secrets, private data, or unsupported production claims.
## Required Checks
- Identify important failure points, user-visible errors, retry boundaries, background work, external calls, and state transitions.
- Prefer clear application errors and project-owned logs over new monitoring dependencies.
- Keep logs safe: no secrets, tokens, cookies, private payloads, tenant data, credentials, or raw PII.
- Document how a future maintainer can detect failure: command output, test failure, log message, status code, trace ID, or manual reproduction.
- Separate local/debug evidence from production observability claims.
## Evidence Requirements

### security.application-security-readiness

Source: `methods/security/application-security-readiness.md`

# Application Security Readiness
## Purpose
Review application security risk at coding time across auth, authorization, tenant isolation, public/private payloads, secrets, input validation, source safety, and supply-chain boundaries.
## Required Checks
- Identify trust boundaries, actors, roles, permissions, data classes, and externally controlled inputs.
- Check auth/session handling, object ownership, IDOR risk, tenant isolation, RLS/database impact, file upload/download paths, redirects, CORS/CSP-sensitive behavior, and token/cookie handling.
- Prefer project-owned security checks and existing scanners before recommending new tools.
- Treat external source and scanner metadata as routing intelligence only.
- Keep approval-required tools scoped and inactive unless explicitly approved.
## Evidence Requirements

### release.release-rollback-readiness

Source: `methods/release/release-rollback-readiness.md`

# Release Rollback Readiness
## Purpose
Gate PR, merge, release-candidate, and post-merge decisions on observed evidence, rollback clarity, and honest limitations.
## Required Checks
- Confirm branch, upstream, working tree, PR, checks, review status, and source freshness when relevant.
- Confirm changed files do not include forbidden surfaces unless explicitly approved.
- Run project-owned validation before merge or release claims.
- Preserve WARN output and skipped/unavailable gates in the report.
- Define rollback: revert path, config undo, data recovery, feature flag, migration rollback, or manual mitigation.
- Avoid tags, releases, package publication, CI edits, external submissions, or deployment changes unless separately requested and approved.

## Provenance

- Source agent path: `agents/qa-test-agent.md`
- Profile paths: `profiles/audit-profile.md`, `profiles/frontend-profile.md`, `profiles/implementation-profile.md`, `profiles/release-profile.md`, `profiles/fullstack-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `internal.engineering-lifecycle-gates`, `internal.frontend-uiux-quality-gates`, `internal.simplicity-surgical-change-discipline`, `internal.tdd-verification-alignment`, `karpathy.goal-driven-execution`, `karpathy.simplicity-surgical-changes`, `matt.git-guardrails`, `matt.tdd`, `matt.to-issues`, `matt.triage-issue`, `osmani.code-review-quality`, `osmani.frontend-ui-engineering`, `osmani.incremental-implementation`, `osmani.shipping-launch`, `osmani.test-driven-development`, `uiux.accessibility`, `uiux.frontend-design`, `uiux.interaction-motion`, `uiux.responsive-layout`, `uiux.webapp-testing`, `orchestration.changed-file-neighborhood-selection`, `mobile.native-mobile-app-quality`, `security.webview-boundary-review`, `architecture.cross-surface-client-contracts`, `reliability.coding-time-production-readiness`, `api.api-contract-and-routing-readiness`, `performance.performance-scalability-cache-readiness`, `reliability.observability-readiness`, `security.application-security-readiness`, `release.release-rollback-readiness`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `anthropic-skills`, `bencium-marketplace`, `code-review-graph`, `karpathy-inspired-skills`, `matt-pocock-skills`, `microsoft-playwright`, `supabase-agent-skills`, `superpowers`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
