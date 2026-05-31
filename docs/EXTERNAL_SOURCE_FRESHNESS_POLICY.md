# External Source Freshness and Extraction Policy

Version: 1.0

This policy defines how the toolkit tracks external sources without auto-importing or activating anything.

## Scope

- Applies to GitHub sources and other externally referenced repositories/docs in `sources/`.
- Applies to the `sources/` intake workflow before any method extraction or skill update.
- Applies to all future batches that use source evidence from `sources/source-watchlist.json`.

## 1) Read-only freshness checks only

- Weekly (or on-demand) checks are **read-only** and may only produce evidence signals.
- Freshness checks do **not** approve:
  - copying, cloning, or importing source text,
  - installing or activating skills,
  - updating source records,
  - running external scripts,
  - changing Codex global config,
  - changing product repositories.
- Freshness signals may propose that a source is worth re-review; they are not execution permissions.
- Freshness issue drafts generated with `--create-issues` are local dry-run review artifacts only. They do not create GitHub issues and do not authorize import, activation, extraction, source-record updates, CI changes, package changes, global config changes, or product-repository changes.
- If GitHub API metadata returns `403` or `429`, the only allowed fallback is a read-only `git ls-remote` default-branch commit check. Fallback must not clone, checkout, fetch raw files, install, execute scripts, activate anything, or update source records automatically.
- Pull request CI may use mock freshness checks to avoid flaky rate-limit failures. A scheduled/manual advisory workflow may run live freshness with `--fail-on-change`; failures are review signals and do not authorize import, activation, extraction, or runtime changes.

## 2) Required source data model

Each source must have and retain:

- source URL
- owner/publisher
- license status
- trust level
- useful patterns
- rejected patterns
- dangerous operations
- prompt-injection risks
- recommendation
- `last reviewed date`
- `last reviewed commit`
- `last checked date`
- `last extracted date` (if/when extraction occurred)
- `last extracted commit` (if/when extraction occurred)

Source metadata for humans is maintained in `sources/*.md`.
Machine tracking is maintained in `sources/source-watchlist.json`.

## 3) Timepoint separation (mandatory)

- `last checked date`: automation signal from the freshness script/report.
- `last reviewed date`: human Skill Scout review/approval date.
- `last reviewed commit`: exact upstream commit reviewed by human.
- `last extracted date`: date toolkit methods/skills were extracted and documented in a PR.
- `last extracted commit`: upstream commit/version used for the latest extracted update.

No update path in this repository should treat these timestamps/commits as interchangeable.

## 4) Source records and watchlist rules

- Source records must represent toolkit-owned evidence and provenance, not raw upstream text.
- Source records should be stable and not accumulate volatile weekly check timestamps.
- `source-watchlist.json` is the canonical list for active scouting targets and should retain:
  - source URL and repo identity, with `https://github.com/<owner>/<repo>` matching `repoOwner` and `repoName`,
  - tracking metadata (`lastReviewed*`, extraction metadata),
  - `neverAutoImport: true` or stronger guardrail equivalent,
  - watched paths for narrowed monitoring.
- Last checked signals from scripts are published in the freshness report and in PR evidence, not auto-written into source records.

For toolkit skills, each `SKILL.md` should keep a stable `Source Provenance` section that references review artifacts and should not carry weekly freshness timestamps or freshness state.

For toolkit methods, each method file must keep stable `sourceRef`, `lastExtracted`, and `status` frontmatter. `sourceRef` maps a normalized method to `sources/source-watchlist.json` IDs so freshness reports can identify affected methods before any issue creation or review routing. Unknown extraction evidence must remain `unknown-review-required`.

## 5) Forking and execution posture

- Forking is not the default.
- A fork may be allowed only as a **read-only reference mirror** after explicit license/trust review.
- A fork mirror must never become active runtime content or runtime source-of-execution.

## 6) Extraction gate

- Any upstream change detected by freshness monitoring requires Skill Scout review before:
  - source-record updates,
  - method extraction,
  - skill creation/update,
  - any sync or activation action.
- If risk changes are detected, the source is held unless governance flow explicitly approves re-application.

## 7) Script alignment

`scripts/check-source-freshness.mjs` is the default monitoring entrypoint and should continue to:

- run against GitHub metadata without cloning,
- limit GitHub API `403`/`429` fallback to `git ls-remote` default-branch commit checks,
- reject unsafe or inconsistent watchlist identities before live inspection,
- support advisory `--fail-on-change` monitoring for changed, failed, unsupported, or review-missing statuses,
- avoid runtime writes outside `docs/SOURCE_FRESHNESS_REPORT.md`,
- keep `neverAutoImport` behavior,
- include affected-method hints derived from method `sourceRef` frontmatter,
- generate dry-run issue drafts with dedupe keys, labels, affected methods, and no-import/no-activation language when `--create-issues` is supplied,
- emit a report explicitly stating that no approval is granted.

The embedded package script `scripts/ai-toolkit/check-source-freshness.mjs` is mock-only distribution scaffolding. It may be used for package-shape validation, but it must not be treated as live freshness evidence or as a substitute for the root live gate.

This policy is the normative control; scripts may enforce and reinforce it.
