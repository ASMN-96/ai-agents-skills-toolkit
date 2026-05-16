---
name: vd-premium-uiux
description: Use for premium UI/UX, frontend visual polish, dashboard UX, mobile/responsive layout, accessibility, visual QA, screenshots, browser verification, luxury SaaS interface quality, and real estate platform UI improvements. Do not use for backend-only, RLS-only, security-only, release-only, or docs-only tasks unless UI behavior is directly affected.
---

# VD Premium UI/UX Execution

## Source Provenance (Stable)

- `docs/EXTERNAL_SOURCE_FRESHNESS_POLICY.md`
- `sources/source-watchlist.json`
- `docs/VD_PREMIUM_UIUX_SOURCE_MAP.md`
- `sources/impeccable.md`
- `sources/uncodixfy.md`
- `docs/SOURCE_FRESHNESS_REPORT.md` (if generated later)
- Relevant reviewed source records (toolkit-owned summaries only; no raw upstream copy).

## Source and execution discipline

- Instruction-only workflow guidance.
- No scripts, no assets, no external installs, and no package-lock or dependency changes.
- This is toolkit-owned normalized guidance, not a raw upstream skill copy.
- Do not add volatile weekly timestamps to this file; freshness signals are owned by source-watchlist and freshness reports.
- Do not run Impeccable, Uncodixfy, external detectors, browser extensions, install commands, copy commands, or upstream scripts.

## Role boundary

- `riss-governance` controls scope, safety, source-of-truth, and release posture.
- `vd-premium-uiux` owns UI/UX diagnosis, visual acceptance criteria, and rendered QA expectations.
- `frontend-agent` implements approved UI changes after acceptance criteria exist.
- `qa-test-agent` or browser tooling validates rendered behavior when available and in scope.
- `reviewer-agent` and `riss-governance` provide final approval.

## 1. Identify target

- Target route/page/component.
- User flow and task outcome expected.
- Device targets (desktop, tablet, mobile breakpoints).
- Current design intent and visible constraints.
- Existing design-system token constraints (spacing, typography, color, component variants).
- Do-not-touch areas (contract-critical paths, high-risk flows, authentication/data behavior).

## 2. Load design context first

- Check for `PRODUCT.md`, `DESIGN.md`, `VD_DESIGN_SYSTEM.md`, `PROJECT_CONTEXT.md`, or equivalent project design source-of-truth.
- Use existing tokens, component conventions, density, typography, copy tone, and interaction rules before inventing anything.
- If no design context exists, infer cautiously from the current UI and report that limitation.
- Treat external source records as normalized review inputs only; never copy raw upstream text, examples, commands, or workflows.

## 3. Inspect existing UI

- Component structure and route composition.
- Layout hierarchy and container/grid behavior.
- Spacing scale, rhythm, and density.
- Typography stack, scale, and hierarchy.
- Color usage, contrast, and brand alignment.
- Interaction states (hover/focus/active/disabled/loading/error/empty).
- Responsive behavior and viewport regressions.
- Accessibility basics (focus order, labels, landmarks, motion tolerance, screen-reader clarity).
- Existing CSS/design tokens and their scope.
- Data/API dependencies that can alter rendered states.

## 4. RISS stack adapter

- Verify the target project's package/config before making stack-specific assumptions.
- When the target verifies a shadcn-style stack, use existing `@/components/ui` primitives and local variants first.
- Preserve Radix accessibility, focus, layering, portal, dismiss, roving-focus, and keyboard semantics.
- Use Tailwind/RISS design tokens, CSS variables, and existing component variants instead of arbitrary one-off styles.
- Use Framer Motion or similar project-verified motion only for purposeful feedback, continuity, loading, or state transitions.
- For dashboards, consider Recharts/data UI behavior, responsive containers, legends, tooltips, empty/error states, and table fallbacks.
- Do not introduce HeroUI or a new component system unless explicitly approved.

## 5. Visual diagnosis before editing

Classify findings as:
- `P1 visual blocker`: breaks comprehension, interaction, or accessibility.
- `P2 important UX issue`: noticeable quality/reliability issue affecting conversion or efficiency.
- `P3 polish/hardening`: minor visual/experience improvements.
- `No action`: no evidence-based UI change needed.

Diagnosis coverage:
- Hierarchy, spacing/density, typography, color/contrast.
- Interaction state coverage and edge states.
- Responsive behavior and overflow behavior.
- Accessibility and visual clarity.
- Brand/premium quality and commercial presentability.

Anti-generic guardrails:
- Reject generic AI dashboard patterns when they are not backed by product context.
- Watch for repeated card grids, fake KPI blocks, oversized rounded panels, excessive gradients, decorative labels, unnecessary glassmorphism, meaningless icon tiles, and nested cards.
- Do not over-apply these guardrails: legitimate existing RISS design choices remain allowed when justified by the design system or current product workflow.

## 6. Dashboard and data UI

- Prioritize scan paths, comparison, filters, sorting, status visibility, and repeated-action efficiency.
- Keep operational dashboards dense but readable; avoid marketing hero composition for work surfaces.
- Validate chart/table behavior across empty, loading, error, long-label, many-series, and narrow-viewport states.
- Ensure charts do not rely on color alone and that important metrics have readable labels or tabular alternatives.

## 7. Accessibility, interaction, and motion

- Preserve semantic controls, labels, visible focus, keyboard reachability, screen-reader names, contrast, and touch targets.
- Check forms, dialogs, dropdowns, popovers, sheets, menus, tabs, tooltips, and command surfaces for focus and escape behavior.
- Motion must explain state, hierarchy, continuity, or feedback; avoid decorative or blocking animation.
- Respect reduced-motion preferences and avoid layout-shifting animation.

## 8. Acceptance criteria and frontend handoff

- Define exactly what visibly improves and what remains unchanged.
- Confirm desktop behavior is preserved where no UI/UX improvement is intended to change it.
- Confirm mobile behavior and breakpoints are intentionally defined and tested.
- Define accessibility minimums (focus visibility, labels, contrast, responsive touch targets).
- Define validation method (manual + runtime checks where possible).
- Handoff to `frontend-agent` must include:
  - screen/route/component,
  - P1/P2/P3 issues,
  - components and tokens to use,
  - states to test,
  - desktop/mobile validation expectations,
  - do-not-touch list.

## 9. Implement narrowly when mode allows

- Make the smallest useful UI changes with minimal churn.
- Preserve existing behavior, API contracts, data contracts, routes, and auth/business logic.
- Avoid new package installs or dependency churn unless explicitly approved.
- Avoid broad refactors; avoid creating a new design system.
- Prefer direct, scoped edits to existing components/patterns.

## 10. Rendered QA loop

- Run available validation in this order:
  - `typecheck` (when available and lightweight).
  - `lint` (when available and lightweight).
  - `build` (when available and in scope).
  - `tests` when behavior changes are likely to affect runtime semantics.
  - Browser verification (Playwright/browser checks) for visual and interaction work.
  - Screenshot review when screenshots are captured.
  - Mobile and desktop viewport checks when possible.
- When UI behavior matters, require desktop and mobile viewport checks unless unavailable.
- Check overlap, clipping, unreadable text, broken layout, bad density, broken modals/popovers, focus states, and chart/table collapse.
- If browser/screenshot verification is required but unavailable, report the limitation and do not claim visual QA passed.
- Do not fabricate or invent screenshot/browser evidence.

## 11. Completion report

- UI changes made and files changed.
- Before/after visual intent.
- Validation run and outcomes.
- Screenshot/browser checks performed (or explicit limitation).
- Responsive and accessibility notes.
- Remaining manual QA and residual risks.
