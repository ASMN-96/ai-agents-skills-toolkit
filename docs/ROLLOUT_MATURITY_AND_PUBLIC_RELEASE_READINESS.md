# Rollout Maturity and Public Release Readiness

Status: Level 3 internal controlled-pilot ready; Level 4 enterprise rollout and Level 5 public release are not approved.

Date: 2026-05-30

This document is a promotion gate. It does not activate runtimes, publish packages, create releases, open PRs, merge branches, install tools, or approve public distribution.

## Maturity Levels

| Level | Name | Promotion Evidence | Allowed Use | Not Allowed |
| --- | --- | --- | --- | --- |
| 0 | Repository scaffold | Core files exist and local docs explain intent | Toolkit-only development | Project sync, runtime claims |
| 1 | Current-session usable | Current Codex session can read the repo, validators pass, no-fake-validation policy exists | Planning and local governance work | Real-project writes |
| 2 | Fresh-session verified | Independent fresh-session smoke test proves skill/router visibility, fallback status, support-tool status, and no silent fallback | One controlled pilot plan | Broad rollout |
| 3 | Controlled-pilot validated | At least one representative project sync is version-pinned, validated, reviewed, and merged through PR | Comparable projects using the same governed PR sync flow | Enterprise rollout, public release |
| 4 | Enterprise rollout ready | Multiple pilots across project types pass, enterprise tool metadata is reviewed, warning thresholds are enforced, rollback evidence exists | Wider internal rollout with owners and gates | Public package/repo release |
| 5 | Public release ready | Public/private leak blockers resolved, license/contribution/security/community policy gaps closed, public package allowlist enforced, release artifacts reproducible | Public repository/package distribution | Unreviewed private overlays or runtime expansion |

## Current Classification

Current level: Level 3.

Evidence:

- Level 2 fresh-session verification is recorded in `docs/RUNTIME_VERIFICATION_REPORT_2026-05-09_FRESH_SESSION.md`.
- Level 3 project-sync pilot evidence is recorded in `docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md`.
- Aggregate validation reports WARN output instead of hiding it.
- Public/private leak scan, stale/unverified classification, sourceRef traceability, enterprise tool metadata, and dry-run issue drafts now exist as governance evidence.

Current blockers for Level 4:

- Enterprise external-tool metadata now has owner buckets, but most evidence fields remain `unknown-review-required` and no tool has enterprise approval.
- Multiple project-type pilots have not been completed.
- Warning thresholds for Level 4 are not yet owner-approved.
- Rollback rehearsal evidence for a Level 4 rollout is not recorded.
- Runtime adapter support beyond Codex is documentation-only.

Current blockers for Level 5:

- Public/private leak report now has zero hard-removal findings, but other internal/private classifications still require package exclusion or owner acceptance before public release.
- Generic public naming aliases/wrappers are implemented and old names remain compatible for one migration window.
- Public package allowlist is enforced by `node scripts/validate-public-package.mjs`; current report is `docs/PUBLIC_PACKAGE_VALIDATION_REPORT.md`.
- `LICENSE`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md` are present but still require owner/legal/community approval before publication.
- `SECURITY.md` now defines supported scope and reporting expectations, but the final vulnerability-reporting channel still needs an owner-approved private contact path.
- Clean-clone verification has not been run in this task.

## Required Validators

Level 3 requires:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/validate-ai-toolkit.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `node scripts/ai-toolkit/validate-version-consistency.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/scan-public-private-leaks.mjs`
- `node scripts/classify-stale-unverified-data.mjs --output docs/STALE_UNVERIFIED_DATA_CLASSIFICATION.md`
- `git diff --check`

Level 4 additionally requires:

- project-sync install/update/validate evidence from multiple representative projects,
- documented owner review for enterprise tool metadata,
- no unreviewed `unknown-review-required` values in tools approved for enterprise use,
- explicit rollback evidence from at least one project update or rehearsal,
- warning threshold decision recorded by owner.

Level 5 additionally requires:

- public package allowlist validation,
- public/private leak scan with zero unresolved public-release blockers in public package paths,
- generic naming compatibility implemented and verified,
- license/contribution/security/community policy files approved,
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

Proposed Level 5 threshold:

- Public package validation must have zero unresolved public-release blockers.
- Public release notes must list any accepted historical exclusions.
- No private overlay markers may exist in public package output.

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

Until these are assigned, Level 4 and Level 5 remain blocked.

## Runtime Policy

Allowed now:

- Codex-first governance through the current active repo skills and project custom-agent artifacts.
- Project sync through reviewed `.ai-toolkit/` project artifacts on feature branches.

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

## Public Release Checklist

- Public/private leak scan has zero unresolved blockers for public package paths.
- Stale/unverified classification has no private overlay markers or unresolved `review-required` content in public package output.
- Generic naming aliases/wrappers are implemented and old names are deprecated but compatible.
- `sourceRef`, `lastExtracted`, and method status are present and validated.
- External tool enterprise metadata is complete for any tool described as approved.
- Source freshness issue workflow remains dry-run unless live issue creation receives separate approval.
- Public package allowlist is explicit and validated.
- `LICENSE` is present and approved.
- `CONTRIBUTING` is present and approved.
- `CODE_OF_CONDUCT` decision is recorded.
- `SECURITY.md` includes public vulnerability reporting and supported-scope details.
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
