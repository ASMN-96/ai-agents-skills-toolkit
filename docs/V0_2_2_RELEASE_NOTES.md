# v0.2.2 Controlled Toolkit Release Notes

## Release Type

`v0.2.2` is a controlled toolkit-only hardening release for the AI Vibe Coding Toolkit.

This release strengthens AI coding-agent governance, activation posture, source-freshness handling, no-write leak-scan validation, public positioning, and release metadata. It does not publish a package, submit a marketplace listing, submit an external application, mutate a product repository, or activate external runtime tools.

## Scope

- Added and documented no-write public/private leak-scan validation mode through `node scripts/scan-public-private-leaks.mjs --check`.
- Upgraded tool activation posture so project-owned tools can be recommended as `active-if-detected`, while missing tools remain `owner-approved-install`.
- Kept noisy or newly adopted CI checks as `ci-advisory` until calibrated and owner-approved for `ci-blocking-after-calibration`.
- Preserved static-only and forbidden-runtime boundaries for MCP, daemon, global config, memory, watcher, and persistence conflicts.
- Remediated source freshness with narrow source-record decisions: reviewed-held for runtime/tooling-sensitive drift and safe refresh for low-risk public-site styling drift.
- Cleaned current public positioning to describe an AI coding-agent governance toolkit rather than a single-runtime or single-tool submission workflow.
- Preserved historical v0.2.0 evidence in `docs/V0_2_0_RELEASE_NOTES.md`.
- Refreshed release version metadata and generated mirrors through repository-supported scripts.

## Explicit Non-Claims

This release is not:

- Level 4 readiness.
- Level 5 readiness.
- Enterprise-certified.
- Production-certified.
- Automatic tool installation.
- CI wiring.
- MCP or global configuration.
- Product repository mutation.
- Package publication.
- Marketplace submission.
- External application submission.
- Broad cross-runtime active support.

## Operating Model

- Sync does not auto-install tools.
- Toolpack installation is one-time owner-approved and scoped to the target project.
- Installed tools are dormant until task-relevant use is approved or safely project-owned.
- `active-if-detected` means a project-owned tool, config, or script can be recommended for the approved scope; it does not mean auto-execution.
- Missing tools require `owner-approved-install`.
- Agents may run installed read-only tools only when task-relevant, scope-approved, and evidence is observed.
- CI blocking requires stable project evidence, calibration, and owner approval.
- Package-manager detection must happen before command recommendations; npm is not the default.

## Tool Posture

| Tool or concept | v0.2.2 posture |
| --- | --- |
| React Doctor | `active-if-detected` when project-owned; `owner-approved-install` when absent; GitHub Action, PR write, and agent skill install require separate approval. |
| Playwright | `active-if-detected` when project-owned; `ci-advisory` first; `ci-blocking-after-calibration` only after stable evidence and owner approval; source drift may remain `REVIEWED_HELD`. |
| Gitleaks | `active-if-detected` or `owner-approved-install` baseline secret scanning. |
| OSV Scanner | `active-if-detected` or `owner-approved-install` dependency vulnerability baseline. |
| Semgrep | `active-if-detected` when project rules/config exist; `owner-approved-install` when absent; `ci-advisory` until rules are scoped. |
| Oxlint | `active-if-detected` or `owner-approved-install`; supplements ESLint for large JS/TS/React repos. |
| dependency-cruiser / Madge / jscpd | `active-if-detected` or `owner-approved-install` for architecture and duplication checks. |
| actionlint / zizmor | `active-if-detected` or `owner-approved-install` for GitHub Actions hardening. |
| GSD-style discipline | Active governance discipline/reference only; no vendoring, install, or global config without approval. |
| RuFlo-style concepts | `held-static-only`; memory hooks, MCP, daemon, global config, background processes, watchers, persistence, and package behavior are `forbidden-runtime`. |

## Source Freshness Decision

- Microsoft Playwright moved from `c30ccc68f833378087338ed9168175e1ce942c00` to `ae106c05e5a40486ab5b9704234c32f0499e9719`. The drift touched injected script, test-runner, config-loader, plugin, web-server, type, and test surfaces, so it is `REVIEWED_HELD`.
- shadcn/ui moved from `9c6a5ee1b14226efbcd31daf54e9bc2e91f647e9` to `7dfd933102fdb881f8abd24fc1ef11a669682b94`. The drift touched package metadata and `pnpm-lock.yaml`, so it is `REVIEWED_HELD`.
- Impeccable moved from `198aa9171948af0bea6d58596ad575cb2de67af7` to `6c7c04866cc98d992b0cdead355f361ceebc7d2a`. The drift touched only public-site light-mode CSS and was safely refreshed as low-risk source-record metadata.
- Post-merge validation then detected Impeccable movement from `6c7c04866cc98d992b0cdead355f361ceebc7d2a` to `347a0c06a2781578f0d3c6fe2cc3a8b64ad5b62d`. That drift touched `bun.lock`, `package.json`, and CLI skill-bundle extraction code, so it is `REVIEWED_HELD`.

These decisions do not approve importing, copying, installing, activating, extracting, running scripts, updating package files, wiring CI, configuring MCP/global settings, or changing product repositories.

## Observed Validation Evidence

Observed release-branch output on 2026-06-05:

| Command | Observed result |
| --- | --- |
| `git status --short` | Intentional release-branch changes only before staging. |
| `git diff --check` | Exit 0; Git printed line-ending working-copy notices, not whitespace errors. |
| `node scripts/ai-toolkit/validate-codex-runtime.mjs` | `PASS validate-codex-runtime`; active runtime `5 skills, 12 project agents`. |
| `node scripts/check-source-freshness.mjs --fail-on-change` | `UNCHANGED 15`, `REVIEWED_HELD 5`, `CHANGED_LOW_RISK 0`, `CHANGED_REVIEW_REQUIRED 0`, `CHANGED_HIGH_RISK 0`, `CHECK_FAILED 0`. |
| `node scripts/scan-public-private-leaks.mjs --check` | check-only mode, scanned files `390`, findings `15`, `Current-tree blockers: 0`, safe guardrail/scanner evidence and false positives only. |
| `node scripts/validate-toolkit.mjs` | `PASS`; 11 checks; WARN summary remained visible for embedded validator review metadata. |
| `node scripts/compile-agents.mjs --dry-run` | 12 compiled-agent outputs previewed with `size-ok`. |
| `node scripts/compile-agents.mjs --confirm-write` | 12 compiled-agent outputs regenerated with `size-ok`. |
| `node scripts/ai-toolkit/build-embedded-package.mjs` | Built `.ai-toolkit` package for `0.2.2`. |
| `node scripts/ai-toolkit/validate-version-consistency.mjs` | `PASS validate-version-consistency`. |
| `node scripts/validate-project-tooling-profiles.mjs` | `PASS`; 12 checks. |
| `node scripts/validate-public-package.mjs` | `PASS validate-public-package`; public files scanned `41`; findings `0`. |
| `node scripts/ai-toolkit/run-toolkit-evals.mjs` | `PASS run-toolkit-evals`. |
| `node --test scripts/test-*.mjs` | 36 tests; 33 pass, 3 skipped, 0 fail. |
| private/product trace search | No current tracked or working-tree matches for the requested private/product markers; hidden `.git/logs` only contains local historical reflog entries. |
| npm/package-manager search | Matches are negative guardrails, source-record rejected commands, validator patterns, and one unsafe-request eval; no active instruction treats npm as default. |

Only observed output may be claimed in the PR, tag, release, or completion report.

## Rollback

- If a docs or metadata issue is found before tagging, revert or amend the release PR through the normal branch and PR flow.
- If the tag or GitHub release is already published, do not delete or rewrite it without owner approval; publish a correction or revert release PR as appropriate.
- Re-run source freshness, runtime validation, toolkit validation, and no-write leak scan after any rollback.

## Next Milestone

The recommended next milestone is a separately approved controlled dry-run against an approved target repository. That follow-up must stay separate from this release and must not be treated as automatic product-repo authorization.
