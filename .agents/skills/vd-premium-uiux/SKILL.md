---
name: vd-premium-uiux
description: Use for premium UI/UX, frontend visual polish, dashboard UX, mobile/responsive layout, accessibility, visual QA, screenshots, browser verification, luxury SaaS interface quality, and real estate platform UI improvements. Do not use for backend-only, RLS-only, security-only, release-only, or docs-only tasks unless UI behavior is directly affected.
---

# VD Premium UI/UX Execution

## Source Provenance (Stable)

- `docs/EXTERNAL_SOURCE_FRESHNESS_POLICY.md`
- `sources/source-watchlist.json`
- `docs/SOURCE_FRESHNESS_REPORT.md` (if generated later)
- Relevant reviewed source records (toolkit-owned summaries only; no raw upstream copy).

## Source and execution discipline

- Instruction-only workflow guidance.
- No scripts, no assets, no external installs, and no package-lock or dependency changes.
- This is toolkit-owned normalized guidance, not a raw upstream skill copy.
- Do not add volatile weekly timestamps to this file; freshness signals are owned by source-watchlist and freshness reports.

## 1. Identify target

- Target route/page/component.
- User flow and task outcome expected.
- Device targets (desktop, tablet, mobile breakpoints).
- Current design intent and visible constraints.
- Existing design-system token constraints (spacing, typography, color, component variants).
- Do-not-touch areas (contract-critical paths, high-risk flows, authentication/data behavior).

## 2. Inspect existing UI

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

## 3. Visual diagnosis before editing

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

## 4. Acceptance criteria before implementation

- Define exactly what visibly improves and what remains unchanged.
- Confirm desktop behavior is preserved where no UI/UX improvement is intended to change it.
- Confirm mobile behavior and breakpoints are intentionally defined and tested.
- Define accessibility minimums (focus visibility, labels, contrast, responsive touch targets).
- Define validation method (manual + runtime checks where possible).

## 5. Implement narrowly when mode allows

- Make the smallest useful UI changes with minimal churn.
- Preserve existing behavior, API contracts, data contracts, routes, and auth/business logic.
- Avoid new package installs or dependency churn unless explicitly approved.
- Avoid broad refactors; avoid creating a new design system.
- Prefer direct, scoped edits to existing components/patterns.

## 6. Verify

- Run available validation in this order:
  - `typecheck` (when available and lightweight).
  - `lint` (when available and lightweight).
  - `build` (when available and in scope).
  - `tests` when behavior changes are likely to affect runtime semantics.
  - Browser verification (Playwright/browser checks) for visual and interaction work.
  - Screenshot review when screenshots are captured.
  - Mobile and desktop viewport checks when possible.
- If browser/screenshot verification is required but unavailable, report the limitation and do not claim visual QA passed.
- Do not fabricate or invent screenshot/browser evidence.

## 7. Completion report

- UI changes made and files changed.
- Before/after visual intent.
- Validation run and outcomes.
- Screenshot/browser checks performed (or explicit limitation).
- Responsive and accessibility notes.
- Remaining manual QA and residual risks.
