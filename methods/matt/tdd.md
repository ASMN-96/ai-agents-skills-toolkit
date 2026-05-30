---
sourceRef: ["matt-pocock-skills"]
lastExtracted: unknown-review-required
status: approved
---

# TDD

## Purpose

Drive implementation through a failing test, passing implementation, and cleanup loop.

## When To Use

Use for behavior changes, bugs, contracts, and risky refactors.

## When Not To Use

Do not force a test loop where the artifact has no executable behavior.

## Agent Roles That Should Embed It

QA Test Agent, Backend Contract Agent, Frontend Agent, Reviewer Agent.

## Operating Rules

- Write the smallest useful failing test.
- Implement only enough to pass.
- Refactor after green.
- Keep tests readable.

## Verification Requirements

Record red/green evidence when feasible, or explain why not.

## Risks / Anti-Patterns

Testing implementation details, skipping the failing state, or broad fixtures that hide intent.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
