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
