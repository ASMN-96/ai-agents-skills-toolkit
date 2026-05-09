# Real Project Readiness

This document defines when the toolkit can be used in real product repositories. It is a readiness gate, not an activation step.

## Current Classification

After Phase 10I, the toolkit is Level 2 certified for one controlled real-project pilot. The passing fresh-session smoke test used a temporary per-command Codex CLI override, `windows.sandbox="unelevated"`, to avoid a WindowsApps PowerShell startup failure in the elevated Windows sandbox. No global Codex config was changed.

Use in a real project is appropriate only for one approved pilot after the first target project uses a feature-branch, dry-run-first sync flow. The pilot must use the same verified temporary unelevated Codex CLI override or another fresh-session shell path that proves local checks before any product repository write.

Phase 10L governance UX hardening does not upgrade this readiness level. New internal helper skill files are repo-available only until fresh-session verification confirms visibility and fallback behavior.

## Readiness Levels

| Level | Name | Meaning | Allowed Use |
| --- | --- | --- | --- |
| 0 | Repository complete | Toolkit files, docs, registries, compiled agents, and policies exist | Toolkit development only |
| 1 | Current-session visible | Current Codex session can see `riss-governance` and validated compiled fallbacks | Toolkit review and planning |
| 2 | Fresh-session verified | A new Codex session confirms skill visibility, agent native/fallback status, support-tool availability, and no silent fallback | One controlled real-project pilot |
| 3 | Pilot validated | One representative project sync is reviewed, version-pinned, validated, and merged through PR | Normal use in comparable real projects |
| 4 | Broad rollout | Multiple project pilots pass with no governance drift or unsafe sync behavior | Wider rollout, still phase-gated |

## Level 2 Gate

Before the first real-project pilot, run a fresh-session smoke test and record a dated report. The report must confirm:

- The exact toolkit commit being certified.
- `riss-governance` is visible in the new session.
- Helper skills are reported as planned, repo-available, unavailable, or runtime-visible as applicable, and are not silently assumed active.
- The 12 core agents are either native-visible or have present compiled fallback files.
- Superpowers, GSD, GitHub/gh, browser/Playwright, Supabase, CodeRabbit, and other support tools are reported as available, unavailable with fallback, or not needed.
- No fallback from native agent to compiled instructions is hidden.
- Repository state is clean and aligned with `origin/main`.
- JSON validation passes.
- No unsafe generated or secret artifacts are present.

Passing Level 2 means the toolkit is ready for one controlled pilot. It does not mean every future project can sync automatically.

The current Level 2 evidence is recorded in `docs/RUNTIME_VERIFICATION_REPORT_2026-05-09_FRESH_SESSION.md`.

## Level 3 Pilot Gate

The first real-project pilot should be low-risk and reversible.

Run it on a project feature branch only. Start with the smallest useful selection of compiled agents, profiles, and toolkit-owned skills. Use the install workflow in dry-run mode first:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -Agents skill-scout-agent,reviewer-agent,qa-test-agent,security-agent `
  -Profiles audit-profile `
  -Skills riss-governance
```

Review the dry-run output. If the project owner approves the exact write scope, rerun with `-ConfirmWrite`, then validate:

```powershell
pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath C:\path\to\project
```

The pilot PR must show:

- `.ai-toolkit/.ai-toolkit-version` pins the toolkit commit.
- `.ai-toolkit/.ai-toolkit.config.json` contains only the selected assets.
- Project `AGENTS.md`, `docs/ai`, product code, package files, and global Codex config are not overwritten.
- The first project use is read-only or planning mode unless the project owner approves a narrow implementation task.
- Project checks and review comments are clean or explicitly accepted as non-blocking.

Passing Level 3 means the toolkit is ready for normal use in comparable real projects with the same phase-gated PR discipline.

## Stop Conditions

Stop before project use if:

- Fresh-session visibility is not verified.
- The target project has dirty, stale, divergent, or detached state and the task depends on source truth.
- A required agent, skill, or support tool is missing and no safe fallback exists.
- The dry run would overwrite project-owned context.
- The selected sync set is broad or unclear.
- Any external source asks to install, activate, clone, run scripts, access secrets, bypass instructions, or hide behavior.

## What This Does Not Authorize

This readiness gate does not authorize automatic rollout, external skill activation, plugin duplication, Superpowers duplication, hooks, daemons, background workers, MCP servers, global memory, federation, global Codex config changes, or product repo changes outside an approved project PR.
