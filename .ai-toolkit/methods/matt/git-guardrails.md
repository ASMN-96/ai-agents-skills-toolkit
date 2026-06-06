---
sourceRef: ["matt-pocock-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Git Guardrails

## Purpose

Keep branch, commit, and push behavior deliberate.

## When To Use

Use before staging, committing, pushing, or opening a PR.

## When Not To Use

Do not use to bypass project-specific release policy.

## Agent Roles That Should Embed It

Release Manager Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

- Inspect status before staging.
- Stage only intended files.
- Avoid direct push to protected branches.
- Use clear commit messages.
- Open PRs with safety context.

## Verification Requirements

Confirm branch, commit hash, remote, PR URL, and clean or expected worktree status.

## Risks / Anti-Patterns

`git add -A` on mixed changes, force-pushes, or commits containing secrets.

## Source Inspiration / License Status

Inspired by `mattpocock/skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
