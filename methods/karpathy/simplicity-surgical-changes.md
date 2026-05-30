---
sourceRef: ["karpathy-inspired-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Simplicity And Surgical Changes

## Purpose

Keep agent edits small, direct, and proportionate.

## When To Use

Use for code changes, refactors, bug fixes, and reviews where scope can drift.

## When Not To Use

Do not use to block necessary architecture work when complexity is justified by clear requirements.

## Agent Roles That Should Embed It

Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

- Prefer the simplest design that satisfies the stated goal.
- Avoid speculative flexibility.
- Touch only files required by the task.
- Match local style before introducing new patterns.
- Mention unrelated cleanup instead of performing it.

## Verification Requirements

Review the diff and confirm each changed line has a direct reason.

## Risks / Anti-Patterns

Overfitting to minimalism, refusing needed abstraction, or hiding a necessary migration.

## Source Inspiration / License Status

Inspired by Karpathy-style agent behavior guidance from `forrestchang/andrej-karpathy-skills`; license unclear during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
