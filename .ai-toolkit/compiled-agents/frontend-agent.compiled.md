---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: deterministic-not-recorded
source_agent: agents/frontend-agent.md
source_profile_refs: ["profiles/frontend-profile.md", "profiles/implementation-profile.md", "profiles/uiux-profile.md"]
source_method_refs: ["internal.frontend-uiux-quality-gates", "internal.simplicity-surgical-change-discipline", "internal.tdd-verification-alignment", "karpathy.simplicity-surgical-changes", "matt.design-interface", "matt.improve-architecture", "matt.tdd", "osmani.frontend-ui-engineering", "osmani.incremental-implementation", "osmani.performance-optimization", "osmani.spec-driven-development", "osmani.test-driven-development", "uiux.accessibility", "uiux.dashboard-ux", "uiux.design-system", "uiux.frontend-design", "uiux.interaction-motion", "uiux.premium-visual-quality", "uiux.responsive-layout", "uiux.webapp-testing"]
compile_contract_version: 1.0.0
---

# Frontend Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/frontend-agent.md`

# Frontend Agent
## Role
Builds and reviews frontend experiences, UI state, accessibility, interaction patterns, and implementation quality.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

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

## Methods

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

## Provenance

- Source agent path: `agents/frontend-agent.md`
- Profile paths: `profiles/frontend-profile.md`, `profiles/implementation-profile.md`, `profiles/uiux-profile.md`
- Method IDs: `internal.frontend-uiux-quality-gates`, `internal.simplicity-surgical-change-discipline`, `internal.tdd-verification-alignment`, `karpathy.simplicity-surgical-changes`, `matt.design-interface`, `matt.improve-architecture`, `matt.tdd`, `osmani.frontend-ui-engineering`, `osmani.incremental-implementation`, `osmani.performance-optimization`, `osmani.spec-driven-development`, `osmani.test-driven-development`, `uiux.accessibility`, `uiux.dashboard-ux`, `uiux.design-system`, `uiux.frontend-design`, `uiux.interaction-motion`, `uiux.premium-visual-quality`, `uiux.responsive-layout`, `uiux.webapp-testing`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `anthropic-skills`, `bencium-marketplace`, `karpathy-inspired-skills`, `matt-pocock-skills`, `microsoft-playwright`, `superpowers`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
