# Engineering Lifecycle Gates

## Purpose

Create disciplined gates from idea through release.

## When To Use

Use for any non-trivial software change or agent workflow.

## When Not To Use

Do not use as heavyweight ceremony for tiny documentation fixes.

## Agent Roles That Should Embed It

All internal agents, especially Product, Architect, QA Test, Reviewer, and Release Manager.

## Operating Rules

- Define the problem.
- Plan small units.
- Build incrementally.
- Verify with evidence.
- Review for quality and risk.
- Release with rollback awareness.

## Verification Requirements

Each gate produces an artifact or evidence note before the next gate.

## Risks / Anti-Patterns

Skipping planning, merging without tests, or treating release as only a push.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
