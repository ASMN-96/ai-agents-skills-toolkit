---
sourceRef: ["anthropic-skills","shadcn-ui"]
lastExtracted: 2026-06-06
status: approved
---

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
