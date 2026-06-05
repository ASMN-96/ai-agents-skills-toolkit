# Project Sync Validation Report 2026-05-30

This report records the first completed representative project sync pilot for the AI Vibe Coding Toolkit. It is project-sync evidence only. It intentionally omits private project names and product details. It does not activate runtime skills, approve broad rollout, import external source content, or change global/user agent configuration.

## Toolkit State

- Toolkit repository: `<owner>/ai-agents-skills-toolkit`
- Toolkit commit used for target sync: `34e3f162ce7dacdb235c9f1471a64d8d6e37ad85`
- Source freshness gate before target merge: `node scripts\check-source-freshness.mjs --fail-on-change` passed with 21 unchanged sources and 0 actionable statuses.
- Source-refresh PR completed during this closeout: `<toolkit-pr-url>`

## Passed Pilot

### Representative Web Application Pilot

- Target repository: private representative project, name intentionally omitted.
- Target PR: `<pilot-project-pr-url>`
- Target merge commit: `<pilot-project-merge-commit>`
- Target branch flow: clean feature branch, PR review, GitHub checks, squash merge, remote branch deletion.
- Changed files:
  - `.ai-toolkit/.ai-toolkit-version`
  - `.ai-toolkit/.ai-toolkit.config.json`
  - `.ai-toolkit/.ai-toolkit-manifest.json`
- Merged toolkit pin: `.ai-toolkit/.ai-toolkit-version` records `34e3f162ce7dacdb235c9f1471a64d8d6e37ad85`.
- Manifest evidence: `.ai-toolkit/.ai-toolkit-manifest.json` exists on the target main branch and records SHA256 hashes for selected managed assets.

Local validation before merge:

- `pwsh -NoProfile -File install\update-project.ps1 -TargetPath <representative-project-sync-worktree>` passed in dry-run mode.
- `pwsh -NoProfile -File install\update-project.ps1 -TargetPath <representative-project-sync-worktree> -ConfirmWrite` passed on a clean upstream-aligned feature branch.
- `pwsh -NoProfile -File install\validate-project-install.ps1 -TargetPath <representative-project-sync-worktree>` passed before and after the final toolkit pin refresh.
- Project dependency install, lint, typecheck, unit/mobile tests, dependency audits, build, GitHub Actions pinning audit, and `git diff --check` passed in the target repository.

GitHub checks before merge:

- Repository validation: passed.
- Production dependency audit: passed.
- GitHub Actions pinning audit: passed.
- OpenSSF Scorecard: passed.
- Preview deployment checks: passed.
- Code review automation: passed.

## Held Target

### Second Representative Target

- Target repository: private representative project, name intentionally omitted.
- Sync worktree was created from the target main branch and used only for the planned `.ai-toolkit` sync.
- Dry-run, confirm-write, and manifest validation reached `.ai-toolkit`-only scope, but the target was not merged because a pre-existing formatting gate failed on non-`.ai-toolkit` product and docs files from the target main branch.
- No target PR was opened or merged.
- The temporary sync branch and worktree were removed.
- This target is not counted as passed Level 3 evidence until its pre-existing format gate is fixed and a new `.ai-toolkit` sync PR passes.

## Boundary

This evidence upgrades representative project sync readiness to Level 3 for comparable projects that follow the same guarded workflow: clean upstream-aligned feature branch, dry-run first, confirm-write only after scope review, manifest validation, project checks, PR review, passing CI, and squash merge.

This report does not approve Level 4 broad rollout, automatic syncs, runtime activation, external skill activation, source imports, package installs from reviewed sources, global/user agent config changes, background workers, hooks, daemons, MCP servers, or product repository changes outside an approved project PR.
