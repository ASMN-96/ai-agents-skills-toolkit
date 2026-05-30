---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Spec Driven Development

## Purpose

Turn intent into implementation-ready requirements before coding.

## When To Use

Use for new features, cross-module work, architectural changes, and unclear requests.

## When Not To Use

Do not require a full spec for a clearly bounded typo or tiny doc correction.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, Backend Contract Agent, Frontend Agent.

## Operating Rules

- Capture goal, users, scope, constraints, interfaces, and success criteria.
- Resolve high-impact ambiguities before implementation.
- Keep specs decision-complete but not bloated.

## Verification Requirements

Confirm bidirectional traceability: every planned task maps to a spec requirement, and every spec requirement maps to at least one task and ideally one test. Maintain a traceability matrix or linked checklist so requirements cannot drop silently.

## Risks / Anti-Patterns

Writing vague specs, hiding decisions in implementation, or planning features not requested.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
