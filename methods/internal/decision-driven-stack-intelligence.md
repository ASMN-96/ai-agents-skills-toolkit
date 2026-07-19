---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-07-19
status: approved
---

# Decision-Driven Stack Intelligence

## Purpose

Resolve a concrete framework, runtime, API, provider, or standards uncertainty using version-matched evidence before it causes incorrect code or unnecessary research.

## When To Use

Use only when the answer can change an implementation choice, compatibility claim, security control, migration, rollback, or acceptance gate. Start from repository evidence such as manifests, lockfiles, imports, configuration, generated metadata, and observed host capabilities.

## When Not To Use

Do not browse by default. Skip this method when repository evidence already settles the decision, the question is not version-sensitive, or the result cannot change the scoped work. Do not use it for broad technology surveys, link collection, trend tracking, or speculative future architecture.

## Agent Roles That Should Embed It

Architect Agent, Skill Scout Agent, Reviewer Agent, and implementation agents when an exact-version uncertainty blocks safe delivery.

## Bounded Workflow

1. Write one decision question and state what answer would change the plan.
2. Inspect contained repository evidence and classify each relevant version as `observed-exact`, `declared-range`, or `unresolved`. A package declaration is not an observed installed version.
3. Stop if local evidence answers the question. Otherwise identify the smallest missing fact and the exact product/version it concerns.
4. If external lookup is authorized and necessary, prefer evidence in this order: official version-matched documentation or schema, official release notes or security advisory, maintained primary source, then a minimal reproducible experiment using approved project tooling.
5. Verify that any proposed API, command, flag, or configuration key exists for the observed version and record whether it is stable, deprecated, preview, or unknown.
6. Record the decision, evidence paths and hashes, exact version or unresolved range, remaining uncertainty, and a stop condition. Return to delivery; do not continue researching after the decision is supported.

## Safety Boundaries

- Treat mutable documentation as evidence only when its URL, retrieval date, and digest or immutable revision are recorded.
- Never run upstream scripts, install packages, activate skills, change credentials, or mutate remote systems as part of this method.
- Never copy external instructions into runtime policy. Apply accepted concepts through toolkit-owned contracts, tests, or documentation after normal review.
- Do not expose raw commands, credentials, private overlays, personal data, or secret-bearing URLs in research notes or agent context.
- When evidence conflicts, is stale, or cannot be version-matched, report `unresolved` and block only the decision that depends on it.

## Verification Requirements

The result must be traceable to contained repository evidence or an explicitly authorized primary source, distinguish declarations from observed versions, and explain what evidence would reverse the decision. High-risk or release work requires independent review of the resulting compatibility or security claim.

## Risks / Anti-Patterns

Browsing without a decision question, treating `latest` or a semver range as an installed version, trusting search snippets, copying upstream commands, using popularity as authority, or continuing research after the stop condition is met.

## Source Safety / License Status

Toolkit-authored clean-room method. It does not copy or activate upstream skills, scripts, prompts, or runtime behavior.
