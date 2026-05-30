---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Shipping And Launch

## Purpose

Prepare changes for controlled release.

## When To Use

Use when a feature, migration, or workflow is ready for production or project sync.

## When Not To Use

Do not use for local-only drafts that are not ready for review.

## Agent Roles That Should Embed It

Release Manager Agent, SRE Performance Agent, QA Test Agent, Reviewer Agent.

## Operating Rules

- Confirm release gates.
- Record change summary and user impact.
- Define rollback or recovery path.
- Keep versioning and compatibility visible.

## Verification Requirements

Confirm tests, review status, release notes, and rollback notes.

## Risks / Anti-Patterns

Shipping without monitoring, skipping changelog, or making irreversible changes without fallback.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
