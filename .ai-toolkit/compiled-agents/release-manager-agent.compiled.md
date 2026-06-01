---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/release-manager-agent.md
source_profile_refs: ["profiles/release-profile.md", "profiles/implementation-profile.md"]
source_method_refs: ["internal.engineering-lifecycle-gates", "internal.skill-anatomy", "karpathy.goal-driven-execution", "matt.git-guardrails", "matt.to-issues", "matt.to-prd", "matt.triage-issue", "osmani.shipping-launch", "security.differential-security-review", "orchestration.context-graph-token-budget", "orchestration.changed-file-neighborhood-selection", "orchestration.compact-agent-context-pack", "orchestration.stale-context-graph-detection"]
compile_contract_version: 1.0.0
---

# Release Manager Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/release-manager-agent.md`

# Release Manager Agent
## Role
Coordinates release readiness, versioning, changelog entries, release gates, rollback notes, and project sync approval.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

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

- Source agent path: `agents/release-manager-agent.md`
- Profile paths: `profiles/release-profile.md`, `profiles/implementation-profile.md`
- Method IDs: `internal.engineering-lifecycle-gates`, `internal.skill-anatomy`, `karpathy.goal-driven-execution`, `matt.git-guardrails`, `matt.to-issues`, `matt.to-prd`, `matt.triage-issue`, `osmani.shipping-launch`, `security.differential-security-review`, `orchestration.context-graph-token-budget`, `orchestration.changed-file-neighborhood-selection`, `orchestration.compact-agent-context-pack`, `orchestration.stale-context-graph-detection`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `code-review-graph`, `karpathy-inspired-skills`, `matt-pocock-skills`, `trailofbits-skills`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
