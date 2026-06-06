---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-06-06
status: approved
---

# Package Manager and Workspace Migration

## Purpose

Control package-manager and workspace migrations as infra-only changes with explicit approval, frozen install evidence, and rollback. Do not force pnpm, Turbo, Nx, yarn, npm, or bun by preference alone, and do not assume npm when the target project has no clear package-manager signal.

## When To Use

Use for package manager changes, lockfile strategy, workspace layout, monorepo tooling, Corepack/packageManager pinning, nested package cleanup, or package-script migration.

## When Not To Use

Do not use for normal feature work unless package-manager or workspace behavior is directly in scope.

## Detection and Command Policy

- Detection order: `packageManager` field in `package.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `package-lock.json`; `yarn.lock`; `bun.lock` or `bun.lockb`.
- The `packageManager` field is the strongest supported signal. `pnpm-lock.yaml` or `pnpm-workspace.yaml` means pnpm; `package-lock.json` means npm; `yarn.lock` means yarn; `bun.lock` or `bun.lockb` means bun.
- Conflicting signals are a stop condition. Missing signals mean no package manager is detected; do not assume npm, and ask or use neutral wording.
- Command wording after detection only: installs use the detected manager's install operation; dev dependencies use the detected manager's dev-dependency form; scripts use the detected manager's script form; one-off execution uses the detected manager's one-off executor.
- Do not recommend `npm` or `npx` unless npm is detected or owner-confirmed. Do not run commands, install dependencies, modify package files, or modify lockfiles without explicit approval.
- Tool activation posture does not bypass detection. `active-if-detected` may use an existing project-owned script/config, but `owner-approved-install` still requires package-manager detection or owner confirmation before any command wording.

## Required Procedure

- Inspect package manager and lockfiles first using the detection policy above.
- Identify all package artifacts: package.json files, lockfiles, workspace configs, Corepack settings, packageManager field, engines, npmrc/yarnrc/pnpm config, CI commands, deployment commands, Dockerfiles, docs, and scripts.
- Do not mix npm, pnpm, yarn, and bun lockfiles unless the repo intentionally owns multiple packages with documented boundaries.
- Do not recommend package-manager commands until the package manager is detected, owner-confirmed, or the ambiguity is reported.
- Do not run package-manager commands, install dependencies, modify package files, or modify lockfiles without explicit approval.
- Treat missing tool adoption as `owner-approved-install`, not as a default install path for npm.
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
- Package-manager signals are missing or ambiguous and the next step depends on package-manager commands.
- More than one lockfile strategy is ambiguous.
- Feature work or UI migration is mixed into the same PR.
- CI/deployment commands would change without explicit approval.
- Frozen install cannot be validated and no owner risk decision exists.
- The migration is being used to force pnpm, Turbo, Nx, yarn, npm, or bun without a repo-specific reason.

## Evidence Requirements

Report package artifacts found, detection signals, selected strategy or ambiguity, files changed, frozen install output if approved and run, validation output, failure classification, rollback, skipped checks, and owner approvals.

## Exact Command Translation Reference

Use this table only after detection or owner confirmation. It describes command shape without providing executable install examples; it is wording guidance, not approval to run commands.

| Action | npm | pnpm | yarn | bun |
| --- | --- | --- | --- | --- |
| Install | install operation for npm | install operation for pnpm | install operation for yarn | install operation for bun |
| Add dev dependency | dev-dependency install form for npm with `-D` | dev-dependency add form for pnpm with `-D` | dev-dependency add form for yarn with `-D` | dev-dependency add form for bun with `-d` |
| Run script | npm script runner with `run <script>` | pnpm script runner, direct or with `run <script>` | yarn script runner | bun script runner with `run <script>` |
| One-off package execution | npm one-off executor (`npx`) | pnpm one-off executor (`dlx`) | yarn one-off executor (`dlx`) | bun one-off executor (`bunx`) |

## Agent Routing

governance owns scope and approval. architect-agent owns workspace structure. code-quality reviews scripts/checks. pr-release-gate owns PR readiness. security-review joins if lifecycle scripts, registries, credentials, or supply-chain risk appear.
