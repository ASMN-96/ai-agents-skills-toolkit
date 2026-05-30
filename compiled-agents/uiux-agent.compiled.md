---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.6.0-draft
toolkit_pin: ai-agents-skills-toolkit@0.6.0-draft
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: 217fd0555ff5a69500c2bda930df916d01b6d58b
source_agent: agents/uiux-agent.md
source_profile_refs: ["profiles/uiux-profile.md", "profiles/frontend-profile.md"]
source_method_refs: ["internal.frontend-uiux-quality-gates", "matt.grill-me", "osmani.frontend-ui-engineering", "uiux.accessibility", "uiux.dashboard-ux", "uiux.design-system", "uiux.frontend-design", "uiux.interaction-motion", "uiux.premium-visual-quality", "uiux.responsive-layout", "uiux.webapp-testing"]
compile_contract_version: 1.0.0
---

# UIUX Agent

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: `agents/uiux-agent.md`

# UIUX Agent
## Role
Evaluates user experience quality, information architecture, visual hierarchy, usability, accessibility, and product fit.
## Status
Stub. This agent will be compiled later from approved methods and project profiles.

## Profiles

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

- Source agent path: `agents/uiux-agent.md`
- Profile paths: `profiles/uiux-profile.md`, `profiles/frontend-profile.md`
- Method IDs: `internal.frontend-uiux-quality-gates`, `matt.grill-me`, `osmani.frontend-ui-engineering`, `uiux.accessibility`, `uiux.dashboard-ux`, `uiux.design-system`, `uiux.frontend-design`, `uiux.interaction-motion`, `uiux.premium-visual-quality`, `uiux.responsive-layout`, `uiux.webapp-testing`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `anthropic-skills`, `bencium-marketplace`, `matt-pocock-skills`, `microsoft-playwright`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
