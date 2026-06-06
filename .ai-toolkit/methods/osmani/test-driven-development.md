---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Test-Driven Development

## Purpose

Use tests to define and protect expected behavior.

## When To Use

Use for bug fixes, behavior changes, business logic, contracts, and regression-prone UI flows.

## When Not To Use

Do not force TDD for static text-only edits where no behavior changes.

## Agent Roles That Should Embed It

QA Test Agent, Backend Contract Agent, Frontend Agent, Reviewer Agent.

## Operating Rules

- Prefer red, green, refactor for risky changes.
- Test public behavior, not incidental internals.
- Keep tests readable and maintainable.

## Verification Requirements

Record the test command, expected result, actual result, and any remaining gap or rationale. For regressions, demonstrate that the test would fail without the fix when feasible.

## Risks / Anti-Patterns

Retrofitting weak tests, over-mocking, or claiming coverage without executing tests.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
