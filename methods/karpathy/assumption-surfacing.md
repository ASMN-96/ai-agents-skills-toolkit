---
sourceRef: ["karpathy-inspired-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Assumption Surfacing

## Purpose

Make agent uncertainty visible before it becomes implementation risk.

## When To Use

Use when a request has ambiguous intent, multiple plausible designs, missing constraints, or conflicting signals.

## When Not To Use

Do not over-question discoverable facts that can be resolved by reading local files or docs.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, Reviewer Agent, Skill Scout Agent.

## Operating Rules

- State material assumptions explicitly.
- Separate facts, inferences, and preferences.
- Present meaningful tradeoffs before choosing.
- Ask only when the answer changes the plan.

## Verification Requirements

Check that the final plan names assumptions and locks a default when proceeding.

## Risks / Anti-Patterns

Analysis paralysis, asking questions already answered by the repo, or silently choosing a risky interpretation.

## Source Inspiration / License Status

Inspired by Karpathy-style agent behavior guidance from `forrestchang/andrej-karpathy-skills`; license unclear during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
