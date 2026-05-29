# Project Sync Validation Report 2026-05-30

This report records the first completed real-project sync pilot for the AI Agent Skills Toolkit. It is project-sync evidence only. It does not activate runtime skills, approve broad rollout, import external source content, or change global Codex configuration.

## Toolkit State

- Toolkit repository: `ASMN-96/ai-agents-skills-toolkit`
- Toolkit commit used for target sync: `34e3f162ce7dacdb235c9f1471a64d8d6e37ad85`
- Source freshness gate before target merge: `node scripts\check-source-freshness.mjs --fail-on-change` passed with 21 unchanged sources and 0 actionable statuses.
- Source-refresh PR completed during this closeout: https://github.com/ASMN-96/ai-agents-skills-toolkit/pull/37

## Passed Pilot

### RISS v2

- Target repository: `ASMN-96/riss-v2`
- Target PR: https://github.com/ASMN-96/riss-v2/pull/90
- Target merge commit: `2f952ca822e350d1a5708d7cb564d3fc678f6d5d`
- Target branch flow: clean feature branch, PR review, GitHub checks, squash merge, remote branch deletion.
- Changed files:
  - `.ai-toolkit/.ai-toolkit-version`
  - `.ai-toolkit/.ai-toolkit.config.json`
  - `.ai-toolkit/.ai-toolkit-manifest.json`
- Merged toolkit pin: `.ai-toolkit/.ai-toolkit-version` records `34e3f162ce7dacdb235c9f1471a64d8d6e37ad85`.
- Manifest evidence: `.ai-toolkit/.ai-toolkit-manifest.json` exists on `origin/main` and records SHA256 hashes for selected managed assets.

Local validation before merge:

- `pwsh -NoProfile -File install\update-project.ps1 -TargetPath <riss-v2-sync-worktree>` passed in dry-run mode.
- `pwsh -NoProfile -File install\update-project.ps1 -TargetPath <riss-v2-sync-worktree> -ConfirmWrite` passed on a clean upstream-aligned feature branch.
- `pwsh -NoProfile -File install\validate-project-install.ps1 -TargetPath <riss-v2-sync-worktree>` passed before and after the final toolkit pin refresh.
- `npm ci` passed, with a local engine warning because the host used Node 24 while the project requests Node `>=22.13.0 <23`.
- `npm ci --prefix apps/mobile` passed.
- `npm run lint -- --max-warnings 0` passed.
- `npm run typecheck` passed.
- `npm run mobile:typecheck` passed.
- `npm test -- --maxWorkers=2` passed.
- `npm run mobile:test` passed.
- `npm audit --omit=dev --audit-level=high` passed with 0 vulnerabilities.
- `npm --prefix apps/mobile audit --omit=dev --audit-level=high` passed with 0 vulnerabilities.
- `npm run build` passed with a Vite plugin deprecation warning.
- `node scripts/check-github-actions-pinning.mjs` passed.
- `git diff --check` passed.

GitHub checks before merge:

- `validate`: passed.
- `Production dependency audit`: passed.
- `GitHub Actions pinning audit`: passed.
- `OpenSSF Scorecard`: passed.
- `Vercel`: passed.
- `Vercel Preview Comments`: passed.
- `CodeRabbit`: passed.

## Held Target

### TwinOps / DT

- Target repository: `ASMN-96/twinops`
- Sync worktree was created from `origin/main` and used only for the planned `.ai-toolkit` sync.
- Dry-run, confirm-write, and manifest validation reached `.ai-toolkit`-only scope, but the target was not merged because `corepack pnpm format:check` failed on pre-existing non-`.ai-toolkit` product and docs files from `origin/main`.
- No TwinOps PR was opened or merged.
- The temporary TwinOps sync branch and worktree were removed.
- TwinOps is not counted as passed Level 3 evidence until its pre-existing format gate is fixed and a new `.ai-toolkit` sync PR passes.

## Boundary

This evidence upgrades real-project sync readiness to Level 3 for comparable projects that follow the same guarded workflow: clean upstream-aligned feature branch, dry-run first, confirm-write only after scope review, manifest validation, project checks, PR review, passing CI, and squash merge.

This report does not approve Level 4 broad rollout, automatic syncs, runtime activation, external skill activation, source imports, package installs from reviewed sources, global Codex config changes, background workers, hooks, daemons, MCP servers, or product repository changes outside an approved project PR.
