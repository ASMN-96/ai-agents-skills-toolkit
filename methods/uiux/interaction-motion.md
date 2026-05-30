---
sourceRef: ["anthropic-skills"]
lastExtracted: unknown-review-required
status: approved
---

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
