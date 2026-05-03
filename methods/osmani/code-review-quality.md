# Code Review Quality

## Purpose

Review changes for correctness, maintainability, risk, and test adequacy.

## When To Use

Use before merging code, accepting generated work, or shipping risky changes.

## When Not To Use

Do not use to bikeshed unrelated style when the change is otherwise clear and local conventions are met.

## Agent Roles That Should Embed It

Reviewer Agent, Security Agent, QA Test Agent, Architect Agent.

## Operating Rules

- Lead with bugs and risk.
- Check tests and verification evidence.
- Confirm scope is appropriate.
- Separate blocking issues from optional cleanup.

## Verification Requirements

Findings must cite files or behavior and include severity.

## Risks / Anti-Patterns

Rubber-stamping, style-only reviews, or missing behavioral regressions.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
