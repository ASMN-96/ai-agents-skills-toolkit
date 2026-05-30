---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: 217fd0555ff5a69500c2bda930df916d01b6d58b
source_agent: agents/database-rls-agent.md
source_profile_refs: ["profiles/backend-profile.md", "profiles/security-profile.md", "profiles/implementation-profile.md"]
source_method_refs: ["backend.supabase-postgres-rls-gates", "osmani.api-interface-design", "osmani.incremental-implementation", "osmani.security-hardening", "security.differential-security-review"]
compile_contract_version: 1.0.0
---

# Database RLS Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/database-rls-agent.md`

# Database RLS Agent
## Role
Reviews database schemas, access boundaries, row-level security policies, migrations, and data safety rules.
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

## Provenance

- Source agent path: `agents/database-rls-agent.md`
- Profile paths: `profiles/backend-profile.md`, `profiles/security-profile.md`, `profiles/implementation-profile.md`
- Method IDs: `backend.supabase-postgres-rls-gates`, `osmani.api-interface-design`, `osmani.incremental-implementation`, `osmani.security-hardening`, `security.differential-security-review`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `supabase-agent-skills`, `trailofbits-skills`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
