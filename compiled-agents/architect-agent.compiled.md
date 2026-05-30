---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: 217fd0555ff5a69500c2bda930df916d01b6d58b
source_agent: agents/architect-agent.md
source_profile_refs: ["profiles/implementation-profile.md", "profiles/backend-profile.md", "profiles/frontend-profile.md"]
source_method_refs: ["internal.engineering-lifecycle-gates", "internal.simplicity-surgical-change-discipline", "internal.skill-anatomy", "karpathy.assumption-surfacing", "karpathy.goal-driven-execution", "karpathy.simplicity-surgical-changes", "matt.design-interface", "matt.grill-me", "matt.improve-architecture", "matt.to-issues", "matt.to-prd", "osmani.api-interface-design", "osmani.code-review-quality", "osmani.spec-driven-development"]
compile_contract_version: 1.0.0
---

# Architect Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/architect-agent.md`

# Architect Agent
## Role
Designs system architecture, module boundaries, data flow, integration contracts, and technical tradeoffs.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

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

## Methods

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

### internal.skill-anatomy

Source: `methods/internal/skill-anatomy.md`

# Skill Anatomy
## Purpose
Define what makes a reusable skill or method easy for agents to discover, load, and apply.
## When To Use
Use when creating toolkit methods, future skills, profiles, or compiled agent inputs.
## When Not To Use
Do not use to activate raw external skills or bypass source evaluation.
## Agent Roles That Should Embed It
Skill Scout Agent, Architect Agent, Release Manager Agent.
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

### matt.to-prd

Source: `methods/matt/to-prd.md`

# To PRD
## Purpose
Turn conversation context into a concise product requirements document.
## When To Use
Use when a feature needs shared product intent before planning.
## When Not To Use
Do not create a PRD for tiny implementation-only changes.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, Release Manager Agent.
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

## Provenance

- Source agent path: `agents/architect-agent.md`
- Profile paths: `profiles/implementation-profile.md`, `profiles/backend-profile.md`, `profiles/frontend-profile.md`
- Method IDs: `internal.engineering-lifecycle-gates`, `internal.simplicity-surgical-change-discipline`, `internal.skill-anatomy`, `karpathy.assumption-surfacing`, `karpathy.goal-driven-execution`, `karpathy.simplicity-surgical-changes`, `matt.design-interface`, `matt.grill-me`, `matt.improve-architecture`, `matt.to-issues`, `matt.to-prd`, `osmani.api-interface-design`, `osmani.code-review-quality`, `osmani.spec-driven-development`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `karpathy-inspired-skills`, `matt-pocock-skills`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
