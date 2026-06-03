# Codex Open Source Application Draft

## Repository positioning

Recommended role selection: **Primary maintainer**

This repository is a governance and execution-quality layer for Codex-driven software work.
It is intentionally separated from product runtime and focuses on validated source records,
agent/skill compilation policy, and reproducible release gates for safe sync workflows.
It is an open-source governance-first repository.

## Why it qualifies (max 500 chars)

The repository provides evidence-based governance rather than opportunistic tooling claims. It documents
explicit scope boundaries, runtime naming and package-surface validation, and publication blockers.
It is positioned as an open-source governance-first repository with auditable sync workflows and
explicit limits, while keeping high-risk activation paths out of default use.

## How API credits support the project (max 500 chars)

API credits support open-source maintainer workflows by powering Codex-assisted policy checks,
validation automation, documentation review, release checklist updates, and source-safety review.
Credits improve consistency and speed for governance work and are not tied to any production runtime
dependency.

## Anything else OpenAI should know (max 500 chars)

This repository is not public-ready, and publication is intentionally deferred until owner-level
history and release-decision blockers are resolved. Public package validation is an allowlist gate only
and does not certify full-repository publication readiness. The repository remains outside enterprise
readiness posture until owner-approved disclosure, licensing, and governance conditions are met.

## Evidence checklist

- `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` and level evidence links
- `docs/NO_FAKE_VALIDATION_POLICY.md`
- public/private leak and stale-unverified reports
- runtime-canonicalization and validator outputs
- publication blockers and owner-decision log
- repository-level source records and protocol docs

## Known limitations

- Publication readiness is not reached yet.
- Whole-repo publication risk is not fully closed.
- Validator allowlist output is necessary but insufficient on its own.
- No claim of public package completeness or enterprise/public release status yet.
