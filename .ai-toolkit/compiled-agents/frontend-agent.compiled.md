---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: 0.2.3
toolkit_pin: ai-agents-skills-toolkit@0.2.3
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: 7f7d8bbcfe0549b85e568386638b73b22496c441
source_agent: agents/frontend-agent.md
compiler: scripts/compile-agents.mjs
registry_input: registries/agents.registry.json
source_profile_refs: ["profiles/frontend-profile.md", "profiles/implementation-profile.md", "profiles/uiux-profile.md", "profiles/fullstack-profile.md"]
source_method_refs: ["internal.frontend-uiux-quality-gates", "internal.simplicity-surgical-change-discipline", "internal.tdd-verification-alignment", "internal.documentation-accuracy-guard", "karpathy.simplicity-surgical-changes", "matt.design-interface", "matt.improve-architecture", "matt.tdd", "osmani.frontend-ui-engineering", "osmani.incremental-implementation", "osmani.performance-optimization", "osmani.spec-driven-development", "osmani.test-driven-development", "uiux.accessibility", "uiux.dashboard-ux", "uiux.design-system", "uiux.frontend-design", "uiux.interaction-motion", "uiux.premium-visual-quality", "uiux.responsive-layout", "uiux.webapp-testing", "uiux.commercial-dashboard-polish-rubric", "mobile.native-mobile-app-quality", "performance.performance-scalability-cache-readiness"]
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

Check visual hierarchy, accessibility, responsive layout, interaction states, loading/error states, typography, spacing, color contrast, and browser verification.

## Verification Requirements

Use screenshots, browser checks, accessibility review, and target workflow testing when UI changes are implemented.
Minimum evidence:
- contrast meets WCAG 2.1 AA: 4.5:1 for normal text and 3:1 for large text,
- all interactive elements are keyboard reachable with visible focus,
- semantic controls have labels, roles, or accessible names,
- mobile and desktop breakpoints plus interaction states are covered,
- screenshots or automated reports from tools such as Axe, Lighthouse, or a color contrast checker are attached or summarized.

## Risks / Anti-Patterns

Generic aesthetics, inaccessible controls, untested responsive states, or visual changes without workflow validation.

## Source Inspiration / License Status

Inspired by Addy frontend UI engineering, Anthropic restricted-source guidance, and local UI/UX governance.
This is normalized/paraphrased guidance, not raw upstream activation.

### internal.simplicity-surgical-change-discipline

Source: `methods/internal/simplicity-surgical-change-discipline.md`

# Simplicity Surgical Change Discipline

## Purpose

Keep changes focused, understandable, reversible, and proportional to the user request.

## When To Use

Use before implementing, reviewing, or refactoring code.

## When Not To Use

Do not use to block necessary migrations, architecture work, or validation fixes when the requirement justifies them.

## Agent Roles That Should Embed It

Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

State assumptions, avoid speculative abstractions, touch only necessary files, match existing style, remove only dead code created by the current change, and surface unrelated issues without editing them.
After generated or changed production code exists, run a guard pass on the diff before delivery. Check for broad error swallowing, hardcoded success paths, invented APIs, copy-from-similar mistakes, unnecessary abstractions, dead code introduced by the change, and comments that explain obvious code instead of intent.
When source-safety or registry work is in scope, keep runtime, package, CI, MCP, global-config, and product-repository boundaries explicit in the diff.

## Verification Requirements

Every changed line should trace to the request, the plan, a source-safety rule, or a verification fix. For generated-code review, report guard-pass findings as reviewer judgment unless a project-owned tool or test actually ran and output was observed.

## Risks / Anti-Patterns

Over-minimizing needed changes, hiding unresolved uncertainty, performing unrelated cleanup, or treating a small diff as proof that runtime boundaries are unaffected.

## Source Safety / License Status

Toolkit-authored cleanroom discipline with Matt Pocock source-record provenance retained for review/refactor alignment and Nagdy Guard Skills used only for normalized guard-pass concepts. License-caveated historical Karpathy source-scouting evidence is not active source authority for this method.
No upstream wording, examples, prompt structure, scripts, or runtime behavior were copied or activated.

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

Prefer red-green-refactor for risky behavior changes. Claims must be backed by fresh verification evidence. Tests should prove user-visible behavior rather than implementation trivia.
When reviewing generated or changed tests, run a focused test-quality guard pass:
- assert behavior and observable effects, not private helper calls;
- mock only real system boundaries such as network, database, filesystem, clock, randomness, third-party SDKs, and LLM APIs;
- use real state/value objects instead of mocks when construction is practical;
- collapse near-duplicate variants into data-driven tests when setup and assertions are the same;
- keep production-regression tests even when they look narrow;
- remove tests that only verify framework guarantees, constants, constructor pass-throughs, or type-system-impossible inputs.

## Verification Requirements

Record the command run, expected result, actual result, run timestamp, commit or PR reference, and any remaining test gap. If only a guard review was performed, label it as review judgment and do not report it as test execution.

## Risks / Anti-Patterns

Passing tests without reading output, testing implementation details, or claiming completion from stale evidence.

## Source Inspiration / License Status

Inspired by Addy Osmani, Matt Pocock, existing Superpowers verification discipline, and Nagdy Guard Skills test-review concepts.
This is normalized/paraphrased guidance, not raw upstream activation, raw skill copying, or duplication.

### internal.documentation-accuracy-guard

Source: `methods/internal/documentation-accuracy-guard.md`

# Documentation Accuracy Guard

## Purpose

Treat technical documentation as verifiable claims about the repository instead of prose generated from memory.

## When To Use

Use when writing or reviewing READMEs, API docs, docstrings, changelogs, tutorials, config examples, command references, or generated docs that mention concrete code behavior.

## When Not To Use

Do not use for marketing copy, visual site theming, or docs changes that make no technical claims.

## Agent Roles That Should Embed It

Reviewer Agent, QA Test Agent, Product Agent, Backend Contract Agent, Frontend Agent.

## Operating Rules

- Verify every referenced symbol, file path, command, flag, endpoint, config key, environment variable, and API shape against the source, schema, route table, CLI help, or current docs.
- Document actual behavior, not intended behavior; if code and docs disagree, flag the mismatch instead of silently choosing one.
- Remove unverifiable scale, performance, compatibility, and production-readiness claims unless they have repository evidence.
- Keep code samples runnable on a clean machine without local paths, real credentials, or hidden prior state.
- When code behavior changes, search related docs for the old symbol, flag, route, or behavior and update all affected surfaces in the same scoped change.
- Do not paraphrase external documentation as local truth; link to upstream docs and describe only how this project uses the external dependency.

## Verification Requirements

For docs updates, report which claim surfaces were checked and what evidence was used. If samples, commands, or links were not executed or verified, label that gap explicitly.

## Risks / Anti-Patterns

Hallucinated function names, stale flags, broken examples, unsupported compatibility claims, docstrings that restate signatures, and documentation updates that drift from actual code.

## Source Safety / License Status

Toolkit-authored cleanroom method inspired by Nagdy Guard Skills docs-review concepts. No upstream wording, examples, prompt structure, scripts, reference files, or runtime behavior were copied or activated.

### karpathy.simplicity-surgical-changes

Source: `methods/karpathy/simplicity-surgical-changes.md`

# Simplicity And Surgical Changes

## Purpose

Keep changes understandable, reversible, and proportionate to the request while preserving production correctness.

## When To Use

Use for code changes, refactors, bug fixes, reviews, source cleanup, and registry updates where scope can drift.

## When Not To Use

Do not use to block necessary architecture or migration work when the requirement and risk justify it.

## Agent Roles That Should Embed It

Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

- Keep each edit traceable to the request, a validator failure, or an explicit safety requirement.
- Match local structure before introducing a new abstraction.
- Avoid future-proofing that does not remove current risk.
- Keep unrelated cleanup as a note unless it blocks validation.
- Prefer small reviewed methods over large cross-cutting rewrites.

## Verification Requirements

Review the diff and confirm each changed file has a direct reason and no hidden runtime, package, CI, MCP, or global-config side effect.

## Risks / Anti-Patterns

Over-minimizing necessary work, refusing a justified abstraction, or hiding a migration inside a small-looking diff.

## Source Safety / License Status

Toolkit-authored cleanroom method. Historical Karpathy-inspired source evidence remains license-caveated and is not active source authority for this method.
No upstream wording, examples, prompt structure, scripts, or runtime behavior were copied or activated.

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

- Compare a few meaningful designs.
- Evaluate ergonomics, future change, testability, and compatibility.
- Choose the smallest interface that communicates intent.

## Verification Requirements

Include example usage and explain why the chosen shape wins.

## Example

Scenario: design a user profile update API.
- Option A: `updateProfile({ userId, data })`
- Option B: `updateProfile(userId, data)`
Choice: Option B wins when the codebase already uses explicit IDs because it keeps the required `userId` visible, is easy to mock in tests, and preserves compatibility with existing call patterns.

## Risks / Anti-Patterns

Novelty for its own sake, premature abstraction, or hiding complexity behind a vague API.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Identify the pain first.
- Preserve behavior.
- Split changes into reversible steps.
- Improve boundaries that directly support the goal.

## Verification Requirements

Show before/after behavior remains compatible and tests cover the moved boundary.

## Risks / Anti-Patterns

Vanity rewrites, abstract architecture diagrams without implementation path, or untested moves.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Write the smallest useful failing test.
- Implement only enough to pass.
- Refactor after green.
- Keep tests readable.

## Verification Requirements

Record red/green evidence when feasible, or explain why not.

## Risks / Anti-Patterns

Testing implementation details, skipping the failing state, or broad fixtures that hide intent.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Respect component boundaries.
- Design for responsive layout, accessibility, loading states, and error states.
- Use existing design systems before inventing new patterns.
- Verify real rendering where practical.

## Verification Requirements

Check viewport behavior, keyboard access, contrast-sensitive states, and browser runtime issues.

## Risks / Anti-Patterns

Generic layouts, missing states, inaccessible controls, or visual-only changes with broken behavior.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Implement one coherent slice at a time.
- Keep defaults safe.
- Verify each slice before expanding scope.
- Preserve rollback options where practical.

## Verification Requirements

Run focused tests or checks after each meaningful slice.

## Risks / Anti-Patterns

Large unverified rewrites, partial states with no guardrails, or hidden scope expansion.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Measure before changing.
- Prioritize user-visible latency and reliability.
- Keep changes small enough to attribute impact.
- Watch bundle size, network waterfalls, rendering cost, and backend hot paths.

## Verification Requirements

Record baseline, change, and post-change measurement when feasible.

## Risks / Anti-Patterns

Micro-optimizing irrelevant paths, hiding complexity, or improving one metric while harming UX.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Capture goal, users, scope, constraints, interfaces, and success criteria.
- Resolve high-impact ambiguities before implementation.
- Keep specs decision-complete but not bloated.

## Verification Requirements

Confirm bidirectional traceability: every planned task maps to a spec requirement, and every spec requirement maps to at least one task and ideally one test. Maintain a traceability matrix or linked checklist so requirements cannot drop silently.

## Risks / Anti-Patterns

Writing vague specs, hiding decisions in implementation, or planning features not requested.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Prefer red, green, refactor for risky changes.
- Test public behavior, not incidental internals.
- Keep tests readable and maintainable.

## Verification Requirements

Record the test command, expected result, actual result, and any remaining gap or rationale. For regressions, demonstrate that the test would fail without the fix when feasible.

## Risks / Anti-Patterns

Retrofitting weak tests, over-mocking, or claiming coverage without executing tests.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Use semantic HTML where possible.
- Provide visible focus.
- Ensure labels and names for controls.
- Respect reduced motion.
- Maintain contrast and readable text.

## Verification Requirements

Check keyboard navigation, focus states, labels, contrast-sensitive elements, and responsive readability.

## Risks / Anti-Patterns

Clickable divs, hidden focus, icon-only controls without labels, or motion that cannot be reduced.

## Source Inspiration / License Status

Inspired by Addy frontend/accessibility references and local UI/UX governance.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Prioritize clear navigation, density, filters, empty states, and table/card readability.
- Keep visual style restrained.
- Make frequent actions efficient.
- Surface status and exceptions clearly.

## Verification Requirements

Check scan paths, sorting/filtering affordances, responsive density, and empty/error states.

## Risks / Anti-Patterns

Oversized hero sections, decorative card-heavy layouts, low information density, or hidden actions.

## Source Inspiration / License Status

Inspired by Anthropic restricted-source guidance and toolkit UI/UX rules.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Prefer existing tokens and components.
- Define color, type, spacing, radius, elevation, and state rules.
- Keep component APIs predictable.
- Treat component ownership as local: use reference guidance to shape interfaces and tokens, not to import upstream component source, registries, package metadata, or CLI behavior.
- Prefer semantic tokens, accessible defaults, explicit states, and compatibility with the project-owned component architecture.
- Avoid one-off visual exceptions without reason.

## Verification Requirements

Check consistency across repeated elements and states.

## Risks / Anti-Patterns

Token sprawl, nested cards, arbitrary palettes, or design rules that cannot be implemented.

## Source Inspiration / License Status

Inspired by Anthropic restricted-source guidance, shadcn/ui reference guidance, and local UI/UX governance.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Design for the domain and user workflow.
- Make hierarchy, spacing, typography, and interaction states intentional.
- Prefer real, inspectable UI over marketing filler.
- Verify rendered output.

## Verification Requirements

Check desktop and mobile layout, component states, screenshot quality, and accessibility minimums:
- keyboard-only navigation with reachable interactive elements,
- visible focus indicators,
- semantic labels, alt text, or form labels for controls,
- contrast of at least 4.5:1 for normal text and 3:1 for large text.

## Risks / Anti-Patterns

Generic AI aesthetics, inaccessible controls, content overflow, or visual polish that breaks behavior.

## Source Inspiration / License Status

Inspired by Anthropic restricted-source guidance, Addy frontend UI engineering, and local UI/UX governance. Licenses vary by source.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Animate meaningful state changes.
- Keep duration short and predictable.
- Prefer transform and opacity for performance.
- Respect `prefers-reduced-motion`.

## Verification Requirements

Check interaction timing, reduced-motion behavior, and visual stability during state changes.

## Risks / Anti-Patterns

Janky animations, layout-thrashing transitions, infinite distractions, or motion-only affordances.

## Source Inspiration / License Status

Inspired by local UI/UX governance and interaction-quality rules.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Use a domain-appropriate visual language.
- Avoid one-note palettes and generic gradients.
- Make typography, spacing, media, and hierarchy deliberate.
- Prefer real product signals over decoration.
- Load relevant product, design-system, and workflow context before visual changes.
- Evaluate polish through concrete dimensions: hierarchy, spacing, contrast, motion restraint, interaction feedback, responsive fit, copy clarity, and state coverage.
- Treat intentionally hidden accessibility text as semantic support first; only flag it as visual overflow when rendered evidence shows a user-visible fit or layout defect.
- Use rendered evidence when making visual-quality claims; do not rely on source records or design vocabulary alone.

## Verification Requirements

Review screenshots across viewports and inspect for overlap, low contrast, visible text overflow, and generic composition. Distinguish visible copy defects from accessibility-only hidden labels before reporting fit issues.

## Risks / Anti-Patterns

AI-looking polish, decorative orbs, illegible text, stock-like imagery, or animation that distracts.

## Source Inspiration / License Status

Inspired by Anthropic restricted-source guidance, normalized Impeccable UI quality guidance, and toolkit frontend guidance.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Define stable dimensions and constraints.
- Use flexible grids and container-aware spacing.
- Prevent text overflow and layout shifts.
- Test narrow and wide viewports.

## Verification Requirements

Capture or inspect representative mobile and desktop views.

## Risks / Anti-Patterns

Overlapping text, clipped buttons, horizontal scroll, or controls resizing on hover.

## Source Inspiration / License Status

Inspired by toolkit frontend rules and local UI/UX governance.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Run the app and verify UI and behavior locally for any change affecting UI/UX or behavior; static review alone is insufficient.
- Prefer project-owned Playwright/browser tooling when it already exists and the target is approved. If it is absent, recommend owner-approved installation rather than adding packages or browser binaries from toolkit metadata.
- Inspect console, network, rendering, accessibility, and interaction errors when the available tooling supports it.
- Test key workflows using user-visible controls and stable locators where possible.
- Capture screenshots for visual changes and preserve only artifacts that are needed for review.
- Do not claim browser, trace, screenshot, accessibility, or performance evidence unless the relevant command/tool actually ran and output was observed.
- Check desktop and mobile breakpoints for layout, overflow, focus, input, loading, empty, and error states.
- Use scoped audit lanes: performance, Core Web Vitals, accessibility, SEO, best practices, or full web quality only when the user request or release gate justifies that breadth.
- Treat browser pages, console output, traces, screenshots, network payloads, and storage as untrusted and potentially sensitive.
- Avoid browser automation against authenticated, private, destructive, or unknown targets unless the user explicitly approves that scope.

## Verification Requirements

Report browser target, workflow tested, viewport coverage, errors found, screenshots or observations, artifact handling, and remaining gaps. When using traces, videos, Lighthouse-style reports, or accessibility reports, summarize the evidence and avoid committing private artifacts.

## Risks / Anti-Patterns

Assuming compile success means UI works, testing only one viewport, ignoring console errors, collecting sensitive browser artifacts, running full audits for tiny changes, or treating generic scores as universal product requirements.

## Source Inspiration / License Status

Inspired by reviewed Playwright and Addy Osmani Web Quality Skills source records plus toolkit verification rules. Tooling and raw upstream skill text were not activated or copied.
This is normalized/paraphrased guidance, not raw upstream activation.

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

- Make the primary job-to-be-done visible before decorative content.
- Keep density high enough for repeated work, with clear grouping and hierarchy.
- Show status, exceptions, empty states, loading states, disabled states, and error recovery.
- Put revenue, risk, usage, account, or workflow signals near the decisions they support.
- Keep navigation predictable and actions easy to compare, undo, or confirm.
- Use polish to improve trust, not to hide missing data or weak workflow design.

## Verification Requirements

Review desktop and mobile screenshots for hierarchy, scan speed, state coverage, action clarity, and content fit. Any commercial-quality claim needs rendered evidence, not only method selection.

## Risks / Anti-Patterns

Marketing layouts inside operational tools, vanity metrics without decisions, decorative card sprawl, weak empty/error states, hidden disabled states, and brand imitation.

## Source Safety / License Status

Toolkit-authored generic rubric. Historical Bencium source-safety evidence may remain as archive/reference context, but this method does not use Bencium as active source authority and does not copy upstream content.

### mobile.native-mobile-app-quality

Source: `methods/mobile/native-mobile-app-quality.md`

# Native Mobile App Quality

## Purpose

Review native mobile and mobile-web app quality without treating mobile as just small web. Mobile validation must account for platform conventions, device constraints, release-like builds, permissions, and real user failure modes.

## When To Use

Use for iOS, Android, Expo, React Native, Capacitor, WebView-heavy, mobile-web, or app-store-bound experiences.
Run `methods/governance/task-intake-routing-gate.md` first for normal-language mobile requests so native, WebView, API, security, release, and package/config surfaces are separated before implementation.

## When Not To Use

Do not use for backend-only, desktop-only, or docs-only work unless mobile consumers are affected.

## Required Review Areas

- iOS and Android platform expectations, navigation conventions, permission UX, gestures, status surfaces, and store-critical behavior.
- Safe areas, notches, Dynamic Island, status bars, Android navigation bars, keyboard overlap, and orientation changes.
- Touch targets, gesture conflicts, scroll behavior, tap latency, haptics expectations, and accidental destructive actions.
- Accessibility labels, roles, focus order, screen-reader behavior, dynamic type, contrast, reduced motion, and keyboard/external input where relevant.
- Offline, poor network, captive portal, retry, timeout, stale data, and request cancellation states.
- Loading, empty, error, retry, disabled, success, sync, conflict, and partial-completion states.
- Permission minimization: request only needed permissions, explain user value, and handle denied/revoked permissions.
- App identifiers, signing, entitlements, bundle IDs, package names, provisioning, store listing, deep-link, push, and app-store-critical config caution.
- App Store and Play Store readiness risks: policy-sensitive claims, privacy labels, data collection, age rating, payment rules, and review-only behavior.
- Release-like build validation rather than assuming Expo Go, debug, hot reload, simulator-only, or development behavior is enough.
- Performance risks: startup, memory, battery, bridge overhead, image/video cost, expensive re-renders, network waterfall, and slow devices.
- Localization, RTL, mixed-language text, truncation, long names, currency/date/number formats, and text fitting.

## Evidence Requirements

Report which validation mode was used:
- simulator;
- physical device;
- Expo Go;
- debug build;
- preview/internal build;

### performance.performance-scalability-cache-readiness

Source: `methods/performance/performance-scalability-cache-readiness.md`

# Performance Scalability Cache Readiness

## Purpose

Review performance, scalability, and cache risk during coding before broad optimization or release claims.

## Required Checks

- Identify the smallest user workflow, route, query, component, job, or cache path affected.
- Separate observed bottlenecks from assumptions.
- Check request count, query shape, indexes, cache keys, invalidation, stale data, tenant/user isolation, bundle/runtime cost, rendering cost, memory, and concurrency risk.
- Prefer existing profiler, benchmark, test, browser, query, build, and log evidence when available.
- Avoid premature rewrites unless measured risk or clear complexity justifies it.

## Evidence Requirements

Report baseline or reproduction evidence when collected, commands actually run, measurement limits, skipped checks, and whether the fix is verified or only risk-reduced.

## Compact Example

Good pattern:
- Identify the exact slow workflow, collect a baseline when feasible, reduce request/query/render/cache cost, and report what improved versus what remains unmeasured.
Bad pattern:
- Rewriting broad architecture because something feels slow without reproduction, measurement, or a scoped hypothesis.
Evidence required:
- Baseline or reproduction evidence when available, commands run, measurement limits, and verified or risk-reduced status.
Stop condition:
- Pause when optimization changes behavior, cache isolation, infrastructure, packages, CI, deployment, or production settings without approval.

## Stop Conditions

- Cache keys may leak tenant/account/user/private data.
- Optimization would change behavior without tests or owner approval.
- Performance readiness is requested without any measurable baseline and the risk is material.
- Package, CI, deployment, infrastructure, or production-observability changes are needed without approval.

## Provenance

- Source agent path: `agents/frontend-agent.md`
- Compiler: `scripts/compile-agents.mjs`
- Agent registry input: `registries/agents.registry.json`
- Profile paths: `profiles/frontend-profile.md`, `profiles/implementation-profile.md`, `profiles/uiux-profile.md`, `profiles/fullstack-profile.md`
- Method IDs: `internal.frontend-uiux-quality-gates`, `internal.simplicity-surgical-change-discipline`, `internal.tdd-verification-alignment`, `internal.documentation-accuracy-guard`, `karpathy.simplicity-surgical-changes`, `matt.design-interface`, `matt.improve-architecture`, `matt.tdd`, `osmani.frontend-ui-engineering`, `osmani.incremental-implementation`, `osmani.performance-optimization`, `osmani.spec-driven-development`, `osmani.test-driven-development`, `uiux.accessibility`, `uiux.dashboard-ux`, `uiux.design-system`, `uiux.frontend-design`, `uiux.interaction-motion`, `uiux.premium-visual-quality`, `uiux.responsive-layout`, `uiux.webapp-testing`, `uiux.commercial-dashboard-polish-rubric`, `mobile.native-mobile-app-quality`, `performance.performance-scalability-cache-readiness`
- Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `anthropic-skills`, `impeccable`, `matt-pocock-skills`, `microsoft-playwright`, `nagdy-guard-skills`, `shadcn-ui`, `superpowers`, `toolkit-authored`, `unknown-review-required`
- Registry files: `registries/agents.registry.json`, `registries/profiles.registry.json`, `registries/methods.registry.json`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
