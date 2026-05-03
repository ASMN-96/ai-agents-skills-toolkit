# Simplicity Surgical Change Discipline

## Purpose

Keep agent changes focused, understandable, and proportional to the user request.

## When To Use

Use before implementing, reviewing, or refactoring code.

## When Not To Use

Do not use to block necessary migrations or architecture work when the requirement justifies it.

## Agent Roles That Should Embed It

Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

State assumptions, avoid speculative abstractions, touch only necessary files, match existing style, remove only dead code created by the current change, and surface unrelated issues without editing them.

## Verification Requirements

Every changed line should trace to the request, the plan, or a verification fix.

## Risks / Anti-Patterns

Over-minimizing needed changes, hiding unresolved uncertainty, or performing unrelated cleanup.

## Source Inspiration / License Status

Inspired by Karpathy-style agent behavior guidance and Matt Pocock review/refactor patterns.

This is normalized/paraphrased guidance, not raw upstream activation.
