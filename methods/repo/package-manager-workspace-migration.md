---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# Package Manager and Workspace Migration

## Purpose

Control package-manager and workspace migrations as infra-only changes with explicit approval, frozen install evidence, and rollback. Do not force pnpm, Turbo, Nx, yarn, npm, or bun by preference alone.

## When To Use

Use for package manager changes, lockfile strategy, workspace layout, monorepo tooling, Corepack/packageManager pinning, nested package cleanup, or package-script migration.

## When Not To Use

Do not use for normal feature work unless package-manager or workspace behavior is directly in scope.

## Required Procedure

- Inspect package manager and lockfiles first.
- Identify all package artifacts: package.json files, lockfiles, workspace configs, Corepack settings, packageManager field, engines, npmrc/yarnrc/pnpm config, CI commands, deployment commands, Dockerfiles, docs, and scripts.
- Do not mix npm, pnpm, yarn, and bun lockfiles unless the repo intentionally owns multiple packages with documented boundaries.
- Choose one committed package-manager strategy with owner approval.
- Use Corepack/packageManager pinning when appropriate.
- Review workspace config and nested package handling.
- Update CI/deployment command docs only in a separately approved migration PR.
- Update documentation for contributors and release operators.
- Validate frozen install, typecheck, lint, tests, build, and workspace commands where available.
- Keep the PR infra-only: no feature work, UI migration, unrelated relocation, dependency upgrades, or architecture churn.
- Classify failures as migration-caused or pre-existing.
- Define rollback: restore package manager metadata, lockfile, commands, docs, and CI/deployment changes.

## Stop Conditions

- Owner approval is missing.
- More than one lockfile strategy is ambiguous.
- Feature work or UI migration is mixed into the same PR.
- CI/deployment commands would change without explicit approval.
- Frozen install cannot be validated and no owner risk decision exists.
- The migration is being used to force pnpm, Turbo, Nx, yarn, npm, or bun without a repo-specific reason.

## Evidence Requirements

Report package artifacts found, selected strategy, files changed, frozen install output, validation output, failure classification, rollback, skipped checks, and owner approvals.

## Agent Routing

governance owns scope and approval. architect-agent owns workspace structure. code-quality reviews scripts/checks. pr-release-gate owns PR readiness. security-review joins if lifecycle scripts, registries, credentials, or supply-chain risk appear.
