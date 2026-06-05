---
sourceRef: unknown-review-required
lastExtracted: 2026-06-05
status: approved
---

# Goal-Driven Execution

## Purpose

Keep implementation, review, and validation tied to the user-visible outcome and the evidence needed to prove it.

## When To Use

Use when implementing features, fixing bugs, planning releases, auditing source safety, or deciding whether work is complete.

## When Not To Use

Do not use as a shortcut around safety, review, source-freshness, leak, runtime, or test gates.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, QA Test Agent, Release Manager Agent, Reviewer Agent.

## Operating Rules

- Restate the outcome in terms the user can verify.
- Define success criteria and non-goals before changing files.
- Prefer the shortest path that satisfies the outcome without weakening safety boundaries.
- Treat validation evidence as part of the work, not a postscript.
- Stop when success cannot be proven honestly.

## Verification Requirements

Report the goal, the proof collected, the checks that were skipped or unavailable, and any remaining uncertainty.

## Risks / Anti-Patterns

Confusing activity with progress, widening scope to look productive, or declaring completion without current evidence.

## Source Safety / License Status

Toolkit-authored cleanroom method. Historical Karpathy-inspired source evidence remains license-caveated and is not active source authority for this method.

No upstream wording, examples, prompt structure, scripts, or runtime behavior were copied or activated.
