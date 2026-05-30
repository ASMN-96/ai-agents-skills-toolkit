---
sourceRef: ["matt-pocock-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Design Interface

## Purpose

Explore interface shapes before committing to a module or API design.

## When To Use

Use when a module boundary, API, component interface, or developer experience is unclear.

## When Not To Use

Do not generate many alternatives when an established local pattern already fits.

## Agent Roles That Should Embed It

Architect Agent, Backend Contract Agent, Frontend Agent, Reviewer Agent.

## Operating Rules

- Compare a few meaningful designs.
- Evaluate ergonomics, future change, testability, and compatibility.
- Choose the smallest interface that communicates intent.

## Verification Requirements

Include example usage and explain why the chosen shape wins.

## Example

Scenario: design a user profile update API.

- Option A: `updateProfile({ userId, data })`
- Option B: `updateProfile(userId, data)`

Choice: Option B wins when the codebase already uses explicit IDs because it keeps the required `userId` visible, is easy to mock in tests, and preserves compatibility with existing call patterns.

## Risks / Anti-Patterns

Novelty for its own sake, premature abstraction, or hiding complexity behind a vague API.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
