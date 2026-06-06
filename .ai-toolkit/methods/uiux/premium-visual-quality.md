---
sourceRef: ["anthropic-skills","impeccable"]
lastExtracted: 2026-06-06
status: approved
---

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
