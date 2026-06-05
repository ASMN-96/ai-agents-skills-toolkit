---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
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

## Required Procedure

- Inspect package manager and lockfiles first using the detection policy above.
- Identify all package artifacts: package.json files, lockfiles, workspace configs, Corepack settings, packageManager field, engines, npmrc/yarnrc/pnpm config, CI commands, deployment commands, Dockerfiles, docs, and scripts.
- Do not mix npm, pnpm, yarn, and bun lockfiles unless the repo intentionally owns multiple packages with documented boundaries.
- Do not recommend package-manager commands until the package manager is detected, owner-confirmed, or the ambiguity is reported.
- Do not run package-manager commands, install dependencies, modify package files, or modify lockfiles without explicit approval.
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

Use this table only after detection or owner confirmation. It is command wording guidance, not approval to run commands.

| Action | npm | pnpm | yarn | bun |
| --- | --- | --- | --- | --- |
| Install | `npm install` | `pnpm install` | `yarn install` | `bun install` |
| Add dev dependency | `npm install -D <pkg>` | `pnpm add -D <pkg>` | `yarn add -D <pkg>` | `bun add -d <pkg>` |
| Run script | `npm run <script>` | `pnpm <script>` or `pnpm run <script>` | `yarn <script>` | `bun run <script>` |
| One-off package execution | `npx <pkg>` | `pnpm dlx <pkg>` | `yarn dlx <pkg>` | `bunx <pkg>` |

## Agent Routing

governance owns scope and approval. architect-agent owns workspace structure. code-quality reviews scripts/checks. pr-release-gate owns PR readiness. security-review joins if lifecycle scripts, registries, credentials, or supply-chain risk appear.
