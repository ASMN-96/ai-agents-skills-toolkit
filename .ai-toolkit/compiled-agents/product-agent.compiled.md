---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.2.0
toolkit_pin: ai-agents-skills-toolkit@0.2.0
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/product-agent.md
source_profile_refs: ["profiles/implementation-profile.md", "profiles/uiux-profile.md", "profiles/planning-profile.md", "profiles/fullstack-profile.md"]
source_method_refs: ["internal.engineering-lifecycle-gates", "karpathy.assumption-surfacing", "karpathy.goal-driven-execution", "matt.grill-me", "matt.to-issues", "matt.to-prd", "matt.triage-issue", "osmani.spec-driven-development", "uiux.dashboard-ux", "uiux.premium-visual-quality", "uiux.commercial-dashboard-polish-rubric", "orchestration.context-graph-token-budget", "orchestration.compact-agent-context-pack"]
compile_contract_version: 1.0.0
---

# Product Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/product-agent.md`

# Product Agent
## Role
Defines product goals, user needs, scope boundaries, acceptance criteria, and release priorities for agent-assisted projects.
## Operating Rules
- Convert broad requests into explicit goals, non-goals, acceptance criteria, and release slices.
- Identify user value, business impact, and workflow risk before implementation.
- Keep scope small enough for a reviewable PR unless the owner approves a larger phase.
- Include token mode and compact context expectations for large planning tasks.
- Handoff structure, sequencing, and rollback concerns to Architect Agent.
## Runtime Status
Repo-local Codex project agent when `.codex/agents/product-agent.toml` is present. Availability means the agent can be selected/recommended; it is not automatically spawned. Runtime behavior is constrained by the TOML sandbox and instruction boundaries. This agent does not authorize product repo edits, package/CI/MCP changes, global configuration edits, external installs, secret access, or release/application actions without explicit owner approval.

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

### uiux-profile

# UIUX Profile
## Included Agents
- UIUX Agent
- Frontend Agent
- Product Agent
- QA Test Agent
- Reviewer Agent
## Recommended Support Tools
- Superpowers as an external Codex execution-discipline plugin.
- Playwright for browser-visible UX verification.

### planning-profile

# Planning Profile
## Included Agents
- Product Agent
- Architect Agent
- Reviewer Agent
## Recommended Support Tools
- Superpowers as an external Codex execution-discipline plugin.
- GSD for serious phase and milestone planning when available.
- GitHub/gh when branch or PR source-of-truth matters.
## Default Mode

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

### karpathy.assumption-surfacing

Source: `methods/karpathy/assumption-surfacing.md`

# Assumption Surfacing
## Purpose
Make uncertainty visible early enough that the user, reviewer, or implementer can correct course before code or release evidence is affected.
## When To Use
Use when intent, constraints, ownership, production risk, or success criteria are not yet concrete enough for a safe implementation decision.
## When Not To Use
Do not ask about facts that can be discovered by reading local files, docs, registries, source records, or command output.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, Reviewer Agent, Skill Scout Agent.
## Operating Rules

### karpathy.goal-driven-execution

Source: `methods/karpathy/goal-driven-execution.md`

# Goal-Driven Execution
## Purpose
Keep implementation, review, and validation tied to the user-visible outcome and the evidence needed to prove it.
## When To Use
Use when implementing features, fixing bugs, planning releases, auditing source safety, or deciding whether work is complete.
## When Not To Use
Do not use as a shortcut around safety, review, source-freshness, leak, runtime, or test gates.
## Agent Roles That Should Embed It
Product Agent, Architect Agent, QA Test Agent, Release Manager Agent, Reviewer Agent.
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

### uiux.commercial-dashboard-polish-rubric

Source: `methods/uiux/commercial-dashboard-polish-rubric.md`

# Commercial Dashboard Polish Rubric
## Purpose
Evaluate whether a dashboard, admin console, CRM, analytics surface, or SaaS operations view feels commercially credible without copying marketplace examples or brand patterns.
## When To Use
Use during UI/UX review for customer-facing dashboards, investor-demo admin tools, monetized SaaS surfaces, and dense operational workflows.
## When Not To Use
Do not use as permission to imitate marketplace screenshots, commercial copy, brand assets, template layouts, or proprietary examples.
## Agent Roles That Should Embed It
UIUX Agent, Frontend Agent, Product Agent, Reviewer Agent.
## Operating Rules

### orchestration.context-graph-token-budget

Source: `methods/orchestration/context-graph-token-budget.md`

# Context Graph Token Budget
Use this method when a task is large enough that full-registry, full-repo, or full-source dumping would waste context or expose private material.
## Purpose
Token budgeting is a governance requirement. A large task must identify the smallest useful context graph before routing agents, writing plans, or reviewing diffs.
## Required Inputs
- task goal and risk level
- changed files or intended files
- selected profile and inline agent lenses
- relevant source/method/profile records
- private-overlay and secret boundaries

### orchestration.compact-agent-context-pack

Source: `methods/orchestration/compact-agent-context-pack.md`

# Compact Agent Context Pack
Use this method when handing work between inline agent lenses, profiles, reviewers, or future approved sub-agents.
## Required Pack Fields
- objective and non-goals
- selected files and reason for each
- changed-file neighborhood summary
- source/method/profile references
- validation commands and expected evidence
- stop conditions
- private-overlay, secret, and product-repo exclusions

## Provenance

- Source agent path: `agents/product-agent.md`
- Profile paths: `profiles/implementation-profile.md`, `profiles/uiux-profile.md`, `profiles/planning-profile.md`, `profiles/fullstack-profile.md`
- Method IDs: `internal.engineering-lifecycle-gates`, `karpathy.assumption-surfacing`, `karpathy.goal-driven-execution`, `matt.grill-me`, `matt.to-issues`, `matt.to-prd`, `matt.triage-issue`, `osmani.spec-driven-development`, `uiux.dashboard-ux`, `uiux.premium-visual-quality`, `uiux.commercial-dashboard-polish-rubric`, `orchestration.context-graph-token-budget`, `orchestration.compact-agent-context-pack`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `code-review-graph`, `matt-pocock-skills`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
