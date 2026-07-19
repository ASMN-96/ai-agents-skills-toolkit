---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Engineering Lifecycle Gates

## Purpose

Define the toolkit's internal lifecycle from idea to release.

## When To Use

Use when compiling agents or reviewing whether a project workflow has enough gates.

## When Not To Use

Do not require every gate for tiny documentation changes with no behavior or release impact.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, QA Test Agent, Reviewer Agent, Release Manager Agent.

## Operating Rules

Select one validation lane from the actual blast radius. Escalate when risk or uncertainty increases; do not force a lower-risk task through a higher lane for ceremony alone.

### Documentation-only

Use for wording, examples, links, or metadata with no runtime-behavior or release change. Require targeted diff review and validation of concrete claims, paths, commands, examples, and links that are in scope.

### Behavior/code

Use when runtime behavior, interfaces, scripts, tests, or executable configuration change. Require focused behavior tests plus the applicable project-owned static checks, integration checks, or build evidence.

### High-risk/release

Use for security, privacy, data, migrations, production access, destructive operations, credentialed systems, or release decisions. Require the Behavior/code lane plus risk-specific negative tests, independent review, rollback or recovery evidence, and protected approvals where policy requires them.

Within the selected lane, apply only the relevant define, plan, build, verify, review, and release gates. A gate must produce applicable evidence before it is credited.

## Evidence Boundaries

- **Local/static** evidence is observed repository state, inspected artifacts, diffs, hashes, and local project-owned command output. It can prove only what that local observation covers.
- **Public linked/read-only** evidence is a credential-free, non-mutating observation of public documentation, links, revisions, or status. When explicitly authorized, it does not by itself elevate a Documentation-only task to High-risk/release.
- **Protected/credentialed remote** evidence is an observed private or protected check, CI result, preview, scanner result, approval, rehearsal, deployment receipt, or other access-controlled record. It requires the applicable access and authorization.
- Public linked/read-only evidence cannot satisfy a gate that requires protected or credentialed evidence.
- Local/static evidence cannot stand in for a required remote result. Selected, planned, mocked, dry-run, stale, metadata-only, or self-reported evidence is not execution proof.
- Unavailable remote evidence must not be reported as passed. Mark it unavailable or blocked and state whether the selected lane permits completion without it.

## Verification Requirements

- Record the selected validation lane and why it matches the change.
- Define: problem statement and acceptance criteria.
- Plan: proportional implementation plan, risk assessment, and evidence path.
- Build: scoped implementation notes and local provenance. A branch or commit reference is advisory provenance, not proof of correctness by equality alone.
- Deterministic hashes, canonical paths, resolved commands, manifests, and declared reproducibility inputs remain applicable evidence gates; commit identity does not replace them.
- Verify: separate Local/static, Public linked/read-only, and Protected/credentialed remote evidence and preserve unavailable checks explicitly.
- Review: review summary, action items, and unresolved risk.
- Release: linked protected evidence, release notes, and rollback or recovery notes when the High-risk/release lane requires them.

## Risks / Anti-Patterns

Skipping evidence, substituting local evidence for a required remote control, treating release as only a push, or applying heavy gates to trivial changes.

## Source Inspiration / License Status

Inspired by Addy Osmani engineering workflow patterns.

This is normalized/paraphrased guidance, not raw upstream activation.
