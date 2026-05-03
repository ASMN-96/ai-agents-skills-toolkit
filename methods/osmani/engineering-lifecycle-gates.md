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

- Planning: planning brief or RFC with acceptance criteria.
- Development / PR: unit or integration test results and code review approval.
- Pre-merge / CI: passing CI result or documented check output and security review when relevant.
- Release: release notes, rollback plan, and smoke test result.

## Risks / Anti-Patterns

Skipping planning, merging without tests, or treating release as only a push.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.
Evaluated commit: `19e49a094d79540e635b107cb3490926ddeac7a3`. Evaluated on: 2026-05-02. Source record: `sources/addy-osmani-agent-skills.md`.

This is normalized/paraphrased guidance, not raw upstream activation.
