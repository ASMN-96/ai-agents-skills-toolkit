# Rollout Maturity and Public Release Readiness

Status: Level 3 controlled-pilot milestone complete; `v0.2.3` is the controlled AI Vibe Coding Toolkit release path for AI coding-agent governance after v0.2 hardening, activation posture hardening, full resource refresh with zero passive source holds, and no-write leak-scan validation. Level 4 enterprise rollout and Level 5 broad public/package maturity remain deferred.

Date: 2026-06-05

This document is a promotion gate. It does not activate runtimes, publish packages, create releases, open PRs, merge branches, install tools, or approve public distribution.

## Maturity Levels

| Level | Name | Promotion Evidence | Allowed Use | Not Allowed |
| --- | --- | --- | --- | --- |
| 0 | Repository scaffold | Core files exist and local docs explain intent | Toolkit-only development | Project sync, runtime claims |
| 1 | Current-session usable | Current AI coding-agent session can read the repo, validators pass, no-fake-validation policy exists | Planning and local governance work | Real-project writes |
| 2 | Fresh-session verified | Independent fresh-session smoke test proves skill/router visibility, fallback status, support-tool status, and no silent fallback | One controlled pilot plan | Broad rollout |
| 3 | Controlled-pilot validated | At least one representative project sync is version-pinned, validated, reviewed, and merged through PR | Controlled AI coding-agent use in comparable projects using the same governed PR sync flow | Enterprise rollout, broad public/package maturity |
| 4 | Enterprise rollout ready | Multiple pilots across project types pass, enterprise tool metadata is reviewed, warning thresholds are enforced, rollback evidence exists | Wider internal rollout with owners and gates | Broad public/package maturity |
| 5 | Broad public/package maturity | Public/private leak blockers resolved or explicitly accepted, license/contribution/security/community policy gaps closed, public package allowlist enforced, release artifacts reproducible, and broader rollout evidence reviewed | Broad public repository/package distribution | Unreviewed private overlays or runtime expansion |

## Current Classification

Current level: Level 3 complete.

Controlled release: `v0.2.3` for AI coding-agent governance after the full local validation gate, PR merge, post-merge verification, tag creation, and GitHub release verification pass. This release does not claim higher maturity, enterprise or production certification, automatic installs, or broad cross-runtime active support. `v0.1.0` remains the historical first controlled public release, and `docs/V0_2_0_RELEASE_NOTES.md` remains historical v0.2.0 evidence.

Evidence:

- Level 2 fresh-session verification is recorded in `docs/RUNTIME_VERIFICATION_REPORT_2026-05-09_FRESH_SESSION.md`.
- Level 3 project-sync pilot evidence is recorded in `docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md`.
- Level 3 milestone closeout is recorded in `docs/LEVEL_3_CONTROLLED_PILOT_CLOSEOUT.md`.
- Level 3 operator checklist is recorded in `docs/LEVEL_3_OPERATOR_CHECKLIST.md`.
- Level 3 mock sync rehearsal is recorded in `docs/LEVEL_3_MOCK_SYNC_REHEARSAL_2026-05-30.md`.
- Private beta readiness is recorded in `docs/PRIVATE_BETA_READINESS_CLOSEOUT.md`.
- Aggregate validation reports WARN output instead of hiding it.
- Public/private leak scan, stale/unverified classification, sourceRef traceability, enterprise tool metadata, and dry-run issue drafts now exist as governance evidence.

Deferred Level 4 evidence backlog:

- Level 4 evidence is tracked in `docs/LEVEL_4_PROMOTION_EVIDENCE.md` and `docs/LEVEL_4_PROMOTION_EVIDENCE.json`; the current gate status is deferred.
- One successful representative pilot is enough to close Level 3 controlled use; additional pilots are future Level 4 evidence, not current Level 3 blockers.
- Enterprise external-tool metadata now has owner buckets, but most evidence fields remain `unknown-review-required` and no tool has enterprise approval.
- Multiple project-type pilots have not been completed.
- Warning thresholds for Level 4 are not yet owner-approved.
- Rollback rehearsal evidence for a Level 4 rollout is not recorded.
- Runtime adapter support beyond the current validated repository runtime is documentation-only.

Current blockers for Level 5 broad public/package maturity:

- Public package validation is allowlist-only and does not certify the whole repository tree or Git history for public GitHub visibility.
- Whole-repo publication review retains non-current-tree owner/history findings that are acceptable for the controlled `v0.2.3` path only when owner acceptance is explicit.
- Historical Git exposure remains unresolved until the owner chooses a clean sanitized repository/mirror or verified history cleanup.
- Public runtime is canonical-only: 5 active skills and 12 active repo-local project agents. Old aliases are not active runtime names.
- Public package allowlist is enforced by `node scripts/validate-public-package.mjs`; current report is `docs/PUBLIC_PACKAGE_VALIDATION_REPORT.md`.
- `LICENSE`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md` are present but still require owner/legal/community approval before publication.
- `SECURITY.md` now defines supported scope and reporting expectations, but the final vulnerability-reporting channel still needs an owner-approved private contact path.
- Clean-clone verification remains required before any future broad package/distribution claim beyond the controlled `v0.2.3` path.

## Required Validators

Level 3 requires:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/validate-ai-toolkit.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `node scripts/ai-toolkit/validate-version-consistency.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/scan-public-private-leaks.mjs --check`
- `node scripts/classify-stale-unverified-data.mjs --output docs/STALE_UNVERIFIED_DATA_CLASSIFICATION.md`
- `git diff --check`

Level 4 additionally requires:

- `node scripts/validate-level4-readiness.mjs --require-ready`,
- project-sync install/update/validate evidence from multiple representative projects,
- documented owner review for enterprise tool metadata,
- no unreviewed `unknown-review-required` values in tools approved for enterprise use,
- explicit rollback evidence from at least one project update or rehearsal,
- warning threshold decision recorded by owner.

Level 5 broad public/package maturity additionally requires:

- public package allowlist validation,
- public/private leak scan with zero unresolved public-release blockers in public package paths,
- whole-repo publication review with zero unresolved public-repository blockers,
- resolved repository-history decision,
- canonical-only runtime validation for 5 active skills and 12 active project agents,
- license/contribution/security/community policy files approved,
- owner-approved security disclosure channel,
- release artifact reproducibility check,
- public install/update docs verified from a clean clone.

## Warning Thresholds

Current Level 3 threshold:

- Aggregate validation may pass with WARN summary only when every WARN is explicit, understood, documented, and not hidden.
- Compiled-agent output is now generated by `scripts/compile-agents.mjs`; any future drift should be treated as a reproducibility failure unless explicitly accepted by owner.

Proposed Level 4 threshold:

- No WARN may be ignored.
- Compiled-agent drift WARN must either be resolved by deterministic compilation or explicitly accepted by owner as a temporary rollout exception.
- Enterprise tool metadata WARN or unknown fields block enterprise approval for that tool.
- `node scripts/validate-level4-readiness.mjs` may report blocked in normal Level 3 work; `--require-ready` must pass before any Level 4 promotion claim.

Proposed Level 5 threshold:

- Public package validation must have zero unresolved public-release blockers.
- Whole-repo publication review must have zero unresolved public-repository blockers.
- Public release notes must list any accepted historical exclusions and history-cleanup decision.
- No private overlay content may exist in the current public repository tree or public package output.

## Owners

Owner decisions still required:

- public naming brand,
- warning threshold defaults,
- public release target: GitHub-only, package distribution, or both,
- enterprise approval owners for each external tool,
- legal/license owner,
- security disclosure owner,
- community/contribution owner,
- release owner.
- repository-history cleanup owner.

Until these are assigned, Level 4 remains deferred and Level 5 remains not started.

## Runtime Policy

Allowed now:

- AI coding-agent governance through the current active repo skills and project custom-agent artifacts.
- Project sync through reviewed `.ai-toolkit/` project artifacts on feature branches.
- Private beta with invited users under the Level 3 operator checklist.

Documentation-only until separately approved:

- `runtimes/claude/`
- `runtimes/cursor/`
- `runtimes/cline/`
- `runtimes/openhands/`

Forbidden without separate approval:

- runtime adapter activation,
- MCP/global config changes,
- external tool installs,
- CI workflow changes,
- package or lockfile changes,
- product-repository writes outside approved project PRs.

## Controlled v0.1.0 Release Checklist

- [x] Full local validation gate passed on the release branch.
- [x] PR was merged to `main` with no required checks or reviews blocked.
- [x] Post-merge validation passed on `main`.
- [x] Leak scan reports `0` current-tree blockers; remaining findings are classified and owner-accepted for this publication path.
- [x] Source freshness reports no actionable changes.
- [x] Runtime validation proves 5 active skills and 12 active repo-local project agents.
- [x] `v0.1.0` annotated tag was created only from validated `main`.
- [x] GitHub release notes state controlled real-project readiness, validation evidence, known exclusions, and no external submission.

## Controlled v0.2.0 Historical Preparation Checklist

- [x] v0.2 hardening PR merged with task-intake routing and modular coding-time readiness methods.
- [x] Final release-candidate check merged with controlled React/TypeScript SaaS dry-run adoption evidence.
- [x] Runtime validation proves 5 active skills and 12 active repo-local project agents.
- [x] Source freshness reports no actionable changes.
- [x] Leak scan reports `0` current-tree blockers.
- [x] Compiled agents were regenerated through the deterministic compiler with dry-run and confirm-write evidence.
- [x] Embedded package mirrors were regenerated through the repository build script.
- [x] Historical release notes are preserved in `docs/V0_2_0_RELEASE_NOTES.md`.

## Controlled v0.2.2 Release Checklist

- [x] v0.2.2 toolkit activation hardening PRs merged.
- [x] No-write leak-scan validation mode exists and leaves the tree clean.
- [x] Source freshness has no actionable changes after safe refresh/reviewed-held decisions.
- [x] Runtime validation proves 5 active skills and 12 active repo-local project agents.
- [x] Tool activation posture is documented and validated.
- [ ] Full release validation gate passed on the v0.2.2 release branch.
- [ ] Release PR was merged to `main`.
- [ ] Post-merge validation passed on `main`.
- [ ] `v0.2.2` annotated tag was created only from validated `main`.
- [ ] GitHub release notes state controlled AI coding-agent toolkit readiness, validation evidence, known exclusions, rollback path, and no external submission.

## Controlled v0.2.3 Release Checklist

- [x] v0.2.3 full resource refresh PR updates source records, source utilization, methods, routing, evals, generated package metadata, and compiled fallbacks.
- [x] Passive active-source `REVIEWED_HELD` is not a final allowed source outcome.
- [x] Source freshness model requires `SYNCED_ADOPTED`, `SYNCED_REFERENCE`, `SYNCED_PLUGIN_DELEGATED`, `ARCHIVED_HARD_BLOCKER`, or `REMOVED_REDUNDANT`.
- [x] Runtime validation target remains 5 active skills and 12 active repo-local project agents.
- [ ] Full release validation gate passed on the v0.2.3 release branch.
- [ ] Release PR was merged to `main`.
- [ ] Post-merge validation passed on `main`.
- [ ] `v0.2.3` annotated tag was created only from validated `main`.
- [ ] GitHub release notes state controlled AI coding-agent toolkit readiness, validation evidence, known exclusions, rollback path, and no external submission.

## Level 5 Checklist

- Public/private leak scan has zero unresolved blockers for public package paths.
- Whole-repo publication review has zero unresolved blockers.
- Repository-history exposure decisions are resolved.
- Stale/unverified classification has no unresolved `review-required` content in public package output.
- Public runtime is canonical-only: 5 active skills and 12 active project agents.
- `sourceRef`, `lastExtracted`, and method status are present and validated.
- External tool enterprise metadata is complete for any tool described as approved.
- Source freshness issue workflow remains dry-run unless live issue creation receives separate approval.
- Public package allowlist is explicit and validated.
- `LICENSE` is present and approved.
- `CONTRIBUTING` is present and approved.
- `CODE_OF_CONDUCT` decision is recorded.
- `SECURITY.md` includes public vulnerability reporting and supported-scope details.
- Security disclosure channel is owner-approved.
- Release notes state exact level, known WARNs, exclusions, and rollback.
- Clean-clone verification passes from documented commands.

## Rollback

For project sync rollback, follow `docs/PROJECT_INSTALL_SAFETY.md`.

For toolkit release rollback:

1. Stop promotion at the current maturity level.
2. Revert the release PR or tag through a normal reviewed Git workflow.
3. Re-run validators and leak/classification reports.
4. Publish a correction note that states the exact artifact, commit, and reason.
5. Do not delete historical evidence; classify it as historical or remove-later in a later cleanup PR.

## Promotion Rule

Promotion requires evidence, not intent. A validator pass, CodeRabbit pass, report-only scan, or dry-run issue draft is useful support evidence, but none of them alone promotes the toolkit to Level 4 or Level 5.
