---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-06-05
status: approved
---

# Simplicity And Surgical Changes

## Purpose

Keep changes understandable, reversible, and proportionate to the request while preserving production correctness.

## When To Use

Use for code changes, refactors, bug fixes, reviews, source cleanup, and registry updates where scope can drift.

## When Not To Use

Do not use to block necessary architecture or migration work when the requirement and risk justify it.

## Agent Roles That Should Embed It

Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

- Keep each edit traceable to the request, a validator failure, or an explicit safety requirement.
- Match local structure before introducing a new abstraction.
- Avoid future-proofing that does not remove current risk.
- Keep unrelated cleanup as a note unless it blocks validation.
- Prefer small reviewed methods over large cross-cutting rewrites.

## Verification Requirements

Review the diff and confirm each changed file has a direct reason and no hidden runtime, package, CI, MCP, or global-config side effect.

## Risks / Anti-Patterns

Over-minimizing necessary work, refusing a justified abstraction, or hiding a migration inside a small-looking diff.

## Source Safety / License Status

Toolkit-authored cleanroom method. Historical Karpathy-inspired source evidence remains license-caveated and is not active source authority for this method.

No upstream wording, examples, prompt structure, scripts, or runtime behavior were copied or activated.
