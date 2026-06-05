---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.2.0
toolkit_pin: ai-agents-skills-toolkit@0.2.0
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/security-agent.md
source_profile_refs: ["profiles/security-profile.md", "profiles/audit-profile.md", "profiles/backend-profile.md", "profiles/fullstack-profile.md", "profiles/source-review-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "internal.source-discovery-workflow", "internal.source-safety-scoring", "osmani.code-review-quality", "osmani.security-hardening", "security.differential-security-review", "orchestration.changed-file-neighborhood-selection", "orchestration.stale-context-graph-detection", "security.webview-boundary-review", "architecture.cross-surface-client-contracts", "api.api-contract-and-routing-readiness", "reliability.observability-readiness", "security.application-security-readiness", "release.release-rollback-readiness"]
compile_contract_version: 1.0.0
---

# Security Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/security-agent.md`

# Security Agent
## Role
Reviews threat models, authorization, secret handling, dependency risk, prompt-injection exposure, and unsafe automation paths.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

### security-profile

# Security Profile
## Included Agents
- Security Agent
- Skill Scout Agent
- Database RLS Agent
- Backend Contract Agent
- Reviewer Agent
## Recommended Support Tools
- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current security, auth, platform, or API guidance.

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

### backend-profile

# Backend Profile
## Included Agents
- Backend Contract Agent
- Database RLS Agent
- Security Agent
- QA Test Agent
- Reviewer Agent
- Architect Agent
## Recommended Support Tools
- Superpowers as an external Codex execution-discipline plugin.

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

### source-review-profile

# Source Review Profile
## Included Agents
- Skill Scout Agent
- Security Agent
- Architect Agent
- Reviewer Agent
## Recommended Support Tools
- GitHub/gh or web search/browser for source identity checks when explicitly needed.
- Superpowers for verification honesty and source-safety discipline.
## Default Mode

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

### internal.source-discovery-workflow

Source: `methods/internal/source-discovery-workflow.md`

# Source Discovery Workflow
## Purpose
Help Skill Scout find candidate skills and methods without installing or activating anything.
## When To Use
Use when searching for new sources, comparing candidate skills, or building a source evaluation backlog.
## When Not To Use
Do not use to install, activate, clone, or run a candidate source.
## Agent Roles That Should Embed It
Skill Scout Agent, Security Agent, Reviewer Agent.
## Operating Rules

### internal.source-safety-scoring

Source: `methods/internal/source-safety-scoring.md`

# Source Safety Scoring
## Purpose
Provide a consistent scoring lens for external source review.
## When To Use
Use during Phase 2 source evaluation and before any Phase 3 method extraction.
## When Not To Use
Do not use as approval to run a source; scoring informs review only.
## Agent Roles That Should Embed It
Skill Scout Agent, Security Agent, Reviewer Agent.
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

### osmani.security-hardening

Source: `methods/osmani/security-hardening.md`

# Security Hardening
## Purpose
Make security review part of normal engineering work.
## When To Use
Use when handling auth, user input, storage, external integrations, secrets, deployment, or automation.
## When Not To Use
Do not block low-risk docs work with unrelated security review.
## Agent Roles That Should Embed It
Security Agent, Backend Contract Agent, Database RLS Agent, Reviewer Agent, Skill Scout Agent.
## Operating Rules

### security.differential-security-review

Source: `methods/security/differential-security-review.md`

# Differential Security Review
## Purpose
Review changed code by risk first, focusing security effort where the diff can alter trust boundaries, access control, secrets, public payloads, or supply-chain behavior.
## When To Use
Use for PR review, dependency changes, auth/security-sensitive diffs, public API changes, database policy changes, external calls, validation changes, payment/value-transfer logic, cryptography, file upload/download paths, or configuration that changes runtime exposure.
## When Not To Use
Do not use as a full audit of unrelated code when the user asked for a narrow typo, formatting, or docs-only change with no security surface. Do not use it to run external scanners or install security tooling unless separately approved.
## Agent Roles That Should Embed It
Security Agent, Reviewer Agent, Backend Contract Agent, Database RLS Agent, Release Manager Agent.
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

### orchestration.stale-context-graph-detection

Source: `methods/orchestration/stale-context-graph-detection.md`

# Stale Context Graph Detection
Use this method when an audit, plan, or review depends on graph-like context that may have changed.
## Staleness Signals
- local branch is stale, dirty, divergent, detached, or not verified against remote
- source freshness reports actionable changes
- registry, profile, method, or embedded package mirrors drift
- changed files are not represented in the selected context pack
- generated reports or docs disagree with live runtime files
- graph evidence came from a previous run, dry run, mock, fallback, or metadata-only record
## Required Response

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

- Source agent path: `agents/security-agent.md`
- Profile paths: `profiles/security-profile.md`, `profiles/audit-profile.md`, `profiles/backend-profile.md`, `profiles/fullstack-profile.md`, `profiles/source-review-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `internal.source-discovery-workflow`, `internal.source-safety-scoring`, `osmani.code-review-quality`, `osmani.security-hardening`, `security.differential-security-review`, `orchestration.changed-file-neighborhood-selection`, `orchestration.stale-context-graph-detection`, `security.webview-boundary-review`, `architecture.cross-surface-client-contracts`, `api.api-contract-and-routing-readiness`, `reliability.observability-readiness`, `security.application-security-readiness`, `release.release-rollback-readiness`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `code-review-graph`, `everything-claude-code`, `supabase-agent-skills`, `superpowers`, `trailofbits-skills`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
