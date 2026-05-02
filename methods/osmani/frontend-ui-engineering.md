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
