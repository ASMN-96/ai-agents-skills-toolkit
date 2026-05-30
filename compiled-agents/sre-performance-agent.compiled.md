---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: 217fd0555ff5a69500c2bda930df916d01b6d58b
source_agent: agents/sre-performance-agent.md
source_profile_refs: ["profiles/sre-profile.md", "profiles/release-profile.md", "profiles/implementation-profile.md"]
source_method_refs: ["osmani.performance-optimization", "osmani.shipping-launch"]
compile_contract_version: 1.0.0
---

# SRE Performance Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/sre-performance-agent.md`

# SRE Performance Agent
## Role
Reviews reliability, observability, performance budgets, runtime limits, incident readiness, and operational failure modes.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

### sre-profile

# SRE Profile
## Included Agents
- SRE Performance Agent
- Backend Contract Agent
- Frontend Agent
- QA Test Agent
- Release Manager Agent
## Recommended Support Tools
- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current hosting, observability, caching, or platform docs.

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

## Provenance

- Source agent path: `agents/sre-performance-agent.md`
- Profile paths: `profiles/sre-profile.md`, `profiles/release-profile.md`, `profiles/implementation-profile.md`
- Method IDs: `osmani.performance-optimization`, `osmani.shipping-launch`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
