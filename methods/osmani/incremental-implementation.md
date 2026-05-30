---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Incremental Implementation

## Purpose

Reduce risk by building in small verified slices.

## When To Use

Use when a change touches multiple files, user workflows, or shared behavior.

## When Not To Use

Do not split so finely that verification becomes meaningless or fragmented.

## Agent Roles That Should Embed It

Frontend Agent, Backend Contract Agent, Database RLS Agent, QA Test Agent.

## Operating Rules

- Implement one coherent slice at a time.
- Keep defaults safe.
- Verify each slice before expanding scope.
- Preserve rollback options where practical.

## Verification Requirements

Run focused tests or checks after each meaningful slice.

## Risks / Anti-Patterns

Large unverified rewrites, partial states with no guardrails, or hidden scope expansion.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
