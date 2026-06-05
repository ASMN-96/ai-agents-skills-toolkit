---
sourceRef: unknown-review-required
lastExtracted: 2026-06-05
status: approved
---

# Assumption Surfacing

## Purpose

Make uncertainty visible early enough that the user, reviewer, or implementer can correct course before code or release evidence is affected.

## When To Use

Use when intent, constraints, ownership, production risk, or success criteria are not yet concrete enough for a safe implementation decision.

## When Not To Use

Do not ask about facts that can be discovered by reading local files, docs, registries, source records, or command output.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, Reviewer Agent, Skill Scout Agent.

## Operating Rules

- Inspect discoverable context first.
- Label assumptions, repo facts, inferences, and user preferences separately.
- Lock a conservative default when the remaining ambiguity is low-risk.
- Ask only when the answer changes architecture, security, data integrity, cost, scope, or release posture.

## Verification Requirements

Check that the plan or final report names material assumptions, states which facts were verified, and identifies any owner decision still required.

## Risks / Anti-Patterns

Analysis paralysis, asking questions already answered by local evidence, or silently choosing an interpretation that changes production risk.

## Source Safety / License Status

Toolkit-authored cleanroom method. Historical Karpathy-inspired source evidence remains license-caveated and is not active source authority for this method.

No upstream wording, examples, prompt structure, scripts, or runtime behavior were copied or activated.
