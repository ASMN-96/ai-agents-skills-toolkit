# Public Launch Checklist

Status: controlled `v0.1.0` release closeout checklist. This document does not authorize external service changes, GitHub profile changes, or Codex OSS application submission.

## Manual Owner Steps

- [x] Keep all other repositories private.
- [x] Keep `ai-agents-skills-toolkit` public under the approved publication path.
- [ ] Pin the toolkit repository on the GitHub profile if desired.
- [ ] Add approved repository topics:
  - `ai-agents`
  - `codex`
  - `openai`
  - `developer-tools`
  - `maintainer-tools`
  - `automation`
  - `software-governance`
  - `release-engineering`
- [ ] Enable Issues if desired for public bug reports and maintainer workflow.
- [ ] Enable Discussions only if the owner wants a community support channel.
- [ ] Enable GitHub private vulnerability reporting if available, or configure an owner-approved security disclosure channel.
- [x] Create `v0.1.0` release only after final validation, PR merge, post-merge verification, tag creation, and GitHub release verification pass.
- [x] Confirm Codex OSS application submission remains pending.

## Pre-Launch Verification

- [x] Repository is public and all required public-facing safeguards remain in place.
- [ ] No private `.git` history, old private overlays, product repositories, secrets, local files, or old Actions logs were newly introduced.
- [x] Runtime validation still reports exactly `5` active skills and `12` active agents.
- [x] Public package validation passes in the public mirror.
- [x] Toolkit validation and evals pass in the public mirror.
- [x] Source freshness is clean or explicitly resolved in a reviewed source-record update.
- [x] Leak findings are either absent, safe guardrail/scanner evidence, false positives, or owner-approved for publication.
- [x] Source freshness has no actionable changes.
- [x] Release notes state Codex-first controlled real-project readiness and do not claim Level 4, Level 5, enterprise readiness, or broad non-Codex runtime support.

## Stop Conditions

- Stop if any validation fails.
- Stop if source freshness reports actionable changes.
- Stop if leak scanning finds current-tree blockers.
- Stop if any product repository content, private overlay, secret, local path, or unapproved security contact appears in the public mirror.
- Stop if owner approval for `v0.1.0` is incomplete.
- Stop if Codex OSS application submission becomes required; that remains a separate owner task.
