---
name: uiux
description: Use for UI/UX authority, visual polish, responsive behavior, accessibility, design-system consistency, workflow clarity, and browser-visible quality. Do not use for backend-only, security-only, release-only, package/config, external design activation, or frontend implementation by default.
---

# UIUX

Use this as the canonical final UI/UX authority skill for frontend, dashboard, wizard, app, and browser-visible experiences.

This skill produces UX critique, design intent, acceptance criteria, and implementation handoff. It does not authorize package changes, framework changes, CI edits, MCP setup, global config changes, backend/security changes, external design-source activation, or claims of browser verification without observed evidence.

## Review Focus

- Primary workflow clarity, user intent, and product value.
- Responsive layout, mobile behavior, accessibility, keyboard usability, and safe interaction states.
- Visual hierarchy, spacing, density, typography, motion, empty/error/loading states, and text fit.
- Design-system constraints, local project source of truth, and consistency across repeated components.
- Dashboard, chart, form, navigation, and data UI acceptance criteria when relevant.
- Evidence quality: screenshots, browser checks, or manual QA must be labeled honestly.

## Measurable UX Targets

- Accessibility claims should target WCAG 2.1 AA and keyboard reachability unless the project sets a stricter standard.
- Lighthouse performance, accessibility, best-practice, or SEO scores count only when Lighthouse actually runs against the relevant page or build.
- Browser-visible layout claims need evidence for the smallest relevant mobile width and one desktop width, or a clear reason the check could not run.
- Do not claim pixel-perfect, accessible, responsive, or production-ready UI from design intent, screenshots alone, or registry metadata.

## Source Boundaries

Use normalized guidance from reviewed UI/UX source maps and methods only. Do not activate open-design, UI UX Pro Max, shadcn CLI/MCP, external design scripts, raw prompts, registry JSON, component source, blocks, package config, or unmanaged design-system files.

For v0.2 project tooling, use `.ai-toolkit/docs/UIUX_DESIGN_RESOURCES.md` for design-resource boundaries and `.ai-toolkit/methods/mobile/native-mobile-app-quality.md` for mobile quality routing. Canonical toolkit sources: `docs/UIUX_DESIGN_RESOURCES.md` and `methods/mobile/native-mobile-app-quality.md`. Base UI and Figma are excluded from current-scope recommendations.

Use `.ai-toolkit/methods/governance/task-intake-routing-gate.md` before coding normal-language UI requests, then route performance-sensitive UI through `.ai-toolkit/methods/performance/performance-scalability-cache-readiness.md` when needed. Canonical toolkit sources: `methods/governance/task-intake-routing-gate.md` and `methods/performance/performance-scalability-cache-readiness.md`.

## Handoff

UIUX defines acceptance criteria. Frontend Agent implements, code-quality validates, QA Test verifies, and PR Release Gate decides readiness.

## Completion Evidence

Report design intent, UX critique, acceptance criteria, files or routes reviewed, browser/manual evidence if actually collected, skipped checks, and remaining QA.
