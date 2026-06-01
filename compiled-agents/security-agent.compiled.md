---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/security-agent.md
source_profile_refs: ["profiles/security-profile.md", "profiles/audit-profile.md", "profiles/backend-profile.md", "profiles/fullstack-profile.md", "profiles/source-review-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "internal.source-discovery-workflow", "internal.source-safety-scoring", "osmani.code-review-quality", "osmani.security-hardening", "security.differential-security-review", "orchestration.changed-file-neighborhood-selection", "orchestration.stale-context-graph-detection"]
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

## Provenance

- Source agent path: `agents/security-agent.md`
- Profile paths: `profiles/security-profile.md`, `profiles/audit-profile.md`, `profiles/backend-profile.md`, `profiles/fullstack-profile.md`, `profiles/source-review-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `internal.source-discovery-workflow`, `internal.source-safety-scoring`, `osmani.code-review-quality`, `osmani.security-hardening`, `security.differential-security-review`, `orchestration.changed-file-neighborhood-selection`, `orchestration.stale-context-graph-detection`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `code-review-graph`, `everything-claude-code`, `ruflo`, `supabase-agent-skills`, `superpowers`, `trailofbits-skills`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
