# Real Project Readiness

This document defines when the toolkit can be used in real product repositories. It is a readiness gate, not an activation step.

## Current Classification

After the 2026-05-30 first representative pilot, the toolkit is Level 3 certified and the current controlled-pilot milestone is closed. It is ready for controlled real-project AI coding-agent use when the same governed branch, PR, dry-run, validation, and owner-approval flow is followed. `v0.2.0` is the controlled public release path for this agent-assisted state after v0.2 hardening, final dry-run adoption evidence, release validation, and tag/release execution. Level 4 enterprise rollout and Level 5 broad public/package maturity remain separate future gates; see `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md`. The original Phase 10I fresh-session smoke test used a temporary per-command runtime override, `windows.sandbox="unelevated"`, to avoid a WindowsApps PowerShell startup failure in the elevated Windows sandbox. No global config was changed.

Use in comparable real projects is appropriate only through clean upstream-aligned feature branches, dry-run-first sync, manifest validation, project-owned checks, PR review, and passing required checks. This does not authorize automatic rollout, product-repository writes without a project PR, runtime/global activation, package/CI/MCP changes, external installs, secret access, or broad cross-runtime active support.

The v0.2 project tooling architecture is a recommendation and evidence model on top of this Level 3 readiness position. It is not a readiness-level promotion, not Level 4, not Level 5, not enterprise-certified, not production-certified, not a tool installation, not CI wiring, not MCP/global configuration, not cross-runtime active support, and not proof that any recommended tool ran.

For v0.2 use, normal-language implementation requests first pass through `methods/governance/task-intake-routing-gate.md` so affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items are explicit before coding.

Phase 10L governance UX hardening did not upgrade readiness by itself. The Level 3 upgrade is based on the merged representative project-sync pilot recorded in `docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md`. Retired helper skill names are not active runtime skills.

## Readiness Levels

| Level | Name | Meaning | Allowed Use |
| --- | --- | --- | --- |
| 0 | Repository complete | Toolkit files, docs, registries, compiled agents, and policies exist | Toolkit development only |
| 1 | Current-session visible | Current Codex session can see `governance` and validated compiled fallbacks | Toolkit review and planning |
| 2 | Fresh-session verified | A new Codex session confirms skill visibility, agent native/fallback status, support-tool availability, and no silent fallback | One controlled real-project pilot |
| 3 | Pilot validated | One representative project sync is reviewed, version-pinned, validated, and merged through PR | Controlled Codex use in comparable real projects |
| 4 | Broad rollout | Multiple project pilots pass with no governance drift or unsafe sync behavior | Wider rollout, still phase-gated |
| 5 | Broad public/package maturity | Public/private blockers, license/contribution/security policy gaps, package allowlist, clean-clone release validation, and broader rollout evidence are resolved | Broad public/package distribution beyond the controlled `v0.2.0` path |

## Level 2 Gate

Before the first real-project pilot, run a fresh-session smoke test and record a dated report. The report must confirm:

- The exact toolkit commit being certified.
- `governance` is visible in the new session.
- Retired helper aliases are not silently assumed active.
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
  -Skills governance
```

Review the dry-run output. If the project owner approves the exact write scope, rerun with `-ConfirmWrite`, then validate:

```powershell
pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath C:\path\to\project
```

The pilot PR must show:

- `.ai-toolkit/.ai-toolkit-version` pins the toolkit commit.
- `.ai-toolkit/.ai-toolkit.config.json` contains only the selected assets.
- `.ai-toolkit/.ai-toolkit-manifest.json` records SHA256 hashes for every managed copied artifact and passes validation.
- Project `AGENTS.md`, `docs/ai`, product code, package files, and global Codex config are not overwritten.
- The first project use is read-only or planning mode unless the project owner approves a narrow implementation task.
- Project checks and review comments are clean or explicitly accepted as non-blocking.

Passing Level 3 means the toolkit is ready for normal use in comparable real projects with the same phase-gated PR discipline.

The current Level 3 project-sync evidence is recorded in `docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md`.

## Controlled Real-Project Agent Use

For real projects, use the toolkit as a governance and evidence layer:

- Start in planning-only or review mode unless a project owner has approved implementation.
- Select the smallest useful set from the 5 canonical skills and 12 repo-local Codex project agents.
- Report selected or recommended agents separately from agents that actually spawned.
- Prefer project-owned checks before proposing new tools.
- Use v0.2 project tooling profiles as recommendation posture only; registry/profile/template presence is not tool execution.
- Use dry-run-first sync where toolkit artifacts are copied into a project.
- Do not modify product repositories without a separate project-specific PR.
- Do not claim validation, browser, scanner, review-bot, GitHub, or runtime execution without current output.

Completion reports must include changed files, commands observed, WARN/skipped/unavailable checks, residual risk, owner-only decisions, and exact next action.

## Level 3 Closeout

The current Level 3 milestone is complete on the first successful representative pilot. Additional pilots remain useful and are still required for Level 4, but they are future evidence backlog rather than blockers for today's Level 3 closeout.

Level 3 closeout evidence is recorded in `docs/LEVEL_3_CONTROLLED_PILOT_CLOSEOUT.md`.

For repeatable Level 3 internal use and private beta, follow `docs/LEVEL_3_OPERATOR_CHECKLIST.md`. Private beta readiness is recorded in `docs/PRIVATE_BETA_READINESS_CLOSEOUT.md`. The fixture rehearsal in `docs/LEVEL_3_MOCK_SYNC_REHEARSAL_2026-05-30.md` confirms the dry-run, confirm-write, and validation path without changing a real product repository.

## Level 4 Broad Rollout Gate

Level 4 requires evidence from multiple representative project pilots, owner-approved warning thresholds, rollback rehearsal evidence, and enterprise tool metadata review. This work is intentionally deferred until the toolkit and target projects are stable enough for additional pilots. Track the future evidence in `docs/LEVEL_4_PROMOTION_EVIDENCE.json` and summarize it in `docs/LEVEL_4_PROMOTION_EVIDENCE.md`.

Audit the current state with:

```powershell
node scripts/validate-level4-readiness.mjs
```

Before any Level 4 promotion claim, the strict gate must pass:

```powershell
node scripts/validate-level4-readiness.mjs --require-ready
```

Templates for missing evidence live under `templates/level4-*.template.md`.

## Stop Conditions

Stop before project use if:

- Fresh-session visibility is not verified.
- The target project is on `main`/`master`, dirty, stale, ahead, behind, divergent, detached, or missing an upstream and the task depends on source truth.
- A required agent, skill, or support tool is missing and no safe fallback exists.
- The dry run would overwrite project-owned context.
- The selected sync set is broad or unclear.
- Any external source asks to install, activate, clone, run scripts, access secrets, bypass instructions, or hide behavior.

## What This Does Not Authorize

This readiness gate does not authorize automatic rollout, external skill activation, plugin duplication, Superpowers duplication, hooks, daemons, background workers, MCP servers, global memory, federation, global/user agent config changes, product repo changes outside an approved project PR, external submissions, enterprise readiness, Level 4 readiness, Level 5 readiness, or broad cross-runtime active support.
