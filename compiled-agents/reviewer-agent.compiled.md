---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: 217fd0555ff5a69500c2bda930df916d01b6d58b
source_agent: agents/reviewer-agent.md
source_profile_refs: ["profiles/audit-profile.md", "profiles/implementation-profile.md", "profiles/release-profile.md", "profiles/security-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "internal.engineering-lifecycle-gates", "internal.frontend-uiux-quality-gates", "internal.simplicity-surgical-change-discipline", "internal.source-discovery-workflow", "internal.source-safety-scoring", "internal.tdd-verification-alignment", "karpathy.assumption-surfacing", "karpathy.goal-driven-execution", "karpathy.simplicity-surgical-changes", "matt.design-interface", "matt.git-guardrails", "matt.grill-me", "matt.improve-architecture", "matt.tdd", "matt.triage-issue", "osmani.api-interface-design", "osmani.code-review-quality", "osmani.frontend-ui-engineering", "osmani.performance-optimization", "osmani.security-hardening", "osmani.shipping-launch", "osmani.test-driven-development", "security.differential-security-review", "uiux.accessibility", "uiux.dashboard-ux", "uiux.design-system", "uiux.frontend-design", "uiux.premium-visual-quality", "uiux.webapp-testing"]
compile_contract_version: 1.0.0
---

# Reviewer Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/reviewer-agent.md`

# Reviewer Agent
## Role
Performs code and design reviews focused on correctness, regressions, test gaps, maintainability, and policy compliance.
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

### karpathy.assumption-surfacing

Source: `methods/karpathy/assumption-surfacing.md`

# Assumption Surfacing
## Purpose
Make agent uncertainty visible before it becomes implementation risk.
## When To Use
Use when a request has ambiguous intent, multiple plausible designs, missing constraints, or conflicting signals.
## When Not To Use
Do not over-question discoverable facts that can be resolved by reading local files or docs.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, Reviewer Agent, Skill Scout Agent.
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

### matt.design-interface

Source: `methods/matt/design-interface.md`

# Design Interface
## Purpose
Explore interface shapes before committing to a module or API design.
## When To Use
Use when a module boundary, API, component interface, or developer experience is unclear.
## When Not To Use
Do not generate many alternatives when an established local pattern already fits.
## Agent Roles That Should Embed It
Architect Agent, Backend Contract Agent, Frontend Agent, Reviewer Agent.
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

### matt.grill-me

Source: `methods/matt/grill-me.md`

# Grill Me
## Purpose
Resolve ambiguity through focused questioning before implementation.
## When To Use
Use when the goal, scope, success criteria, audience, or tradeoffs are unclear.
## When Not To Use
Do not ask questions that local inspection can answer.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, UIUX Agent, Reviewer Agent.
## Operating Rules

### matt.improve-architecture

Source: `methods/matt/improve-architecture.md`

# Improve Architecture
## Purpose
Plan architecture improvements without drifting into rewrite enthusiasm.
## When To Use
Use when existing structure blocks a requested change or creates clear risk.
## When Not To Use
Do not refactor unrelated code just because it could be cleaner.
## Agent Roles That Should Embed It
Architect Agent, Reviewer Agent, Backend Contract Agent, Frontend Agent.
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

### osmani.api-interface-design

Source: `methods/osmani/api-interface-design.md`

# API Interface Design
## Purpose
Create clear and stable contracts between systems.
## When To Use
Use when designing APIs, module boundaries, public types, or integration contracts.
## When Not To Use
Do not over-design internal helpers that have one local caller and no stable contract.
## Agent Roles That Should Embed It
Architect Agent, Backend Contract Agent, Database RLS Agent, Reviewer Agent.
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

### osmani.performance-optimization

Source: `methods/osmani/performance-optimization.md`

# Performance Optimization
## Purpose
Improve performance through measurement and targeted changes.
## When To Use
Use when performance requirements exist, regressions are suspected, or user experience depends on speed.
## When Not To Use
Do not optimize speculative bottlenecks without measurement.
## Agent Roles That Should Embed It
SRE Performance Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent.
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

### uiux.dashboard-ux

Source: `methods/uiux/dashboard-ux.md`

# Dashboard UX
## Purpose
Design operational interfaces for scanning, comparison, and repeated action.
## When To Use
Use for dashboards, admin tools, CRMs, analytics surfaces, and internal operations UI.
## When Not To Use
Do not use marketing-page composition for dense work surfaces.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, Product Agent, Reviewer Agent.
## Operating Rules

### uiux.design-system

Source: `methods/uiux/design-system.md`

# Design System
## Purpose
Use consistent tokens, components, and interaction rules across UI work.
## When To Use
Use when creating or reviewing repeatable interface patterns.
## When Not To Use
Do not create a design system for a one-off page unless reuse is likely.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, Reviewer Agent.
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

### uiux.premium-visual-quality

Source: `methods/uiux/premium-visual-quality.md`

# Premium Visual Quality
## Purpose
Raise visual quality without sacrificing usability or performance.
## When To Use
Use for branded websites, polished apps, demos, and high-visibility UI.
## When Not To Use
Do not prioritize aesthetics over clarity, accessibility, or product workflow.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, Product Agent, Reviewer Agent.
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

## Provenance

- Source agent path: `agents/reviewer-agent.md`
- Profile paths: `profiles/audit-profile.md`, `profiles/implementation-profile.md`, `profiles/release-profile.md`, `profiles/security-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `internal.engineering-lifecycle-gates`, `internal.frontend-uiux-quality-gates`, `internal.simplicity-surgical-change-discipline`, `internal.source-discovery-workflow`, `internal.source-safety-scoring`, `internal.tdd-verification-alignment`, `karpathy.assumption-surfacing`, `karpathy.goal-driven-execution`, `karpathy.simplicity-surgical-changes`, `matt.design-interface`, `matt.git-guardrails`, `matt.grill-me`, `matt.improve-architecture`, `matt.tdd`, `matt.triage-issue`, `osmani.api-interface-design`, `osmani.code-review-quality`, `osmani.frontend-ui-engineering`, `osmani.performance-optimization`, `osmani.security-hardening`, `osmani.shipping-launch`, `osmani.test-driven-development`, `security.differential-security-review`, `uiux.accessibility`, `uiux.dashboard-ux`, `uiux.design-system`, `uiux.frontend-design`, `uiux.premium-visual-quality`, `uiux.webapp-testing`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `anthropic-skills`, `bencium-marketplace`, `everything-claude-code`, `karpathy-inspired-skills`, `matt-pocock-skills`, `microsoft-playwright`, `ruflo`, `supabase-agent-skills`, `superpowers`, `trailofbits-skills`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
