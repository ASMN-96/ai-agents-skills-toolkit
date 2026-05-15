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

Inspired by Addy frontend UI engineering, Bencium design audit ideas, and local UI/UX governance.

This is normalized/paraphrased guidance, not raw upstream activation.
