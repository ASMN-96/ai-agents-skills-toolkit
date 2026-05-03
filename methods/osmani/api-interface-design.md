# API Interface Design

## Purpose

Create clear and stable contracts between systems.

## When To Use

Use when designing APIs, module boundaries, public types, or integration contracts.

## When Not To Use

Do not over-design internal helpers that have one local caller and no stable contract.

## Agent Roles That Should Embed It

Architect Agent, Backend Contract Agent, Database RLS Agent, Reviewer Agent.

## Operating Rules

- Define inputs, outputs, errors, validation, and compatibility expectations.
- Prefer contract clarity over implicit behavior.
- Keep versioning and consumer impact visible.

## Verification Requirements

Confirm examples, tests, and docs match the contract.

## Risks / Anti-Patterns

Leaky abstractions, vague errors, silent breaking changes, or accepting invalid states.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
