---
sourceRef: ["matt-pocock-skills"]
lastExtracted: unknown-review-required
status: approved
---

# To Issues

## Purpose

Break a plan into independently grabbable implementation units.

## When To Use

Use when a spec needs task slicing for branch or issue workflow.

## When Not To Use

Do not create issue churn for a single-file or trivial change.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, Release Manager Agent, QA Test Agent.

## Operating Rules

- Slice by user-visible or independently verifiable outcomes.
- Include acceptance criteria.
- Minimize dependencies between issues.

## Verification Requirements

Each issue should be implementable and testable without guessing.

## Risks / Anti-Patterns

Layer-based tickets that cannot ship alone, vague acceptance, or hidden dependencies.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
