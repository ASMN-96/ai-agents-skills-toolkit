---
sourceRef: ["addy-osmani-agent-skills","anthropic-skills"]
lastExtracted: 2026-06-05
status: approved
---

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

Check visual hierarchy, accessibility, responsive layout, interaction states, typography, spacing, color contrast, and browser verification.

Build a state matrix only when applicable to the workflow: loading, empty, error, disabled, partial success, permission denied, offline, stale data, destructive-action confirmation, cancellation, and recovery. State why a dimension is not applicable rather than adding fake UI states.

When the project declares multiple locales or directionality requirements, verify text direction, content expansion, truncation/wrapping, and locale-aware date, number, and currency formatting. Do not impose a specific language, region, or right-to-left policy on products that have not declared it.

## Verification Requirements

Use screenshots, browser checks, accessibility review, and target workflow testing when UI changes are implemented.

Minimum evidence:

- contrast meets WCAG 2.2 AA: 4.5:1 for normal text and 3:1 for large text,
- all interactive elements are keyboard reachable with visible focus,
- semantic controls have labels, roles, or accessible names,
- mobile and desktop breakpoints plus applicable interaction, permission, offline, stale, partial, confirmation, and recovery states are covered,
- project-declared locales are checked for text direction, content expansion, and date, number, and currency formatting when applicable,
- screenshots or automated reports from tools such as Axe, Lighthouse, or a color contrast checker are attached or summarized.

## Risks / Anti-Patterns

Generic aesthetics, inaccessible controls, untested responsive states, or visual changes without workflow validation.

## Source Inspiration / License Status

Inspired by Addy frontend UI engineering, Anthropic restricted-source guidance, and local UI/UX governance.

This is normalized/paraphrased guidance, not raw upstream activation.
