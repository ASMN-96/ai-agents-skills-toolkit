---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/backend-contract-agent.md
source_profile_refs: ["profiles/backend-profile.md", "profiles/implementation-profile.md", "profiles/security-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "internal.simplicity-surgical-change-discipline", "internal.tdd-verification-alignment", "karpathy.simplicity-surgical-changes", "matt.design-interface", "matt.improve-architecture", "matt.tdd", "osmani.api-interface-design", "osmani.incremental-implementation", "osmani.performance-optimization", "osmani.security-hardening", "osmani.spec-driven-development", "osmani.test-driven-development", "security.differential-security-review"]
compile_contract_version: 1.0.0
---

# Backend Contract Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/backend-contract-agent.md`

# Backend Contract Agent
## Role
Defines and reviews backend APIs, request and response contracts, validation behavior, error models, and compatibility expectations.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

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

### osmani.spec-driven-development

Source: `methods/osmani/spec-driven-development.md`

# Spec Driven Development
## Purpose
Turn intent into implementation-ready requirements before coding.
## When To Use
Use for new features, cross-module work, architectural changes, and unclear requests.
## When Not To Use
Do not require a full spec for a clearly bounded typo or tiny doc correction.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, Backend Contract Agent, Frontend Agent.
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

## Provenance

- Source agent path: `agents/backend-contract-agent.md`
- Profile paths: `profiles/backend-profile.md`, `profiles/implementation-profile.md`, `profiles/security-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `internal.simplicity-surgical-change-discipline`, `internal.tdd-verification-alignment`, `karpathy.simplicity-surgical-changes`, `matt.design-interface`, `matt.improve-architecture`, `matt.tdd`, `osmani.api-interface-design`, `osmani.incremental-implementation`, `osmani.performance-optimization`, `osmani.security-hardening`, `osmani.spec-driven-development`, `osmani.test-driven-development`, `security.differential-security-review`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `karpathy-inspired-skills`, `matt-pocock-skills`, `supabase-agent-skills`, `superpowers`, `trailofbits-skills`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
