# Public Launch Checklist

Status: manual owner checklist only. This document does not authorize repository visibility changes, releases, external service changes, or Codex OSS application submission.

## Manual Owner Steps

- [ ] Make the GitHub profile presentable/public if required for the launch.
- [ ] Keep all other repositories private.
- [ ] Create or make public only the sanitized `ai-agents-skills-toolkit` repository.
- [ ] Pin the toolkit repository on the GitHub profile.
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
- [ ] Create `v0.1.0` release only after final owner approval and public mirror verification.
- [ ] Submit the Codex OSS application only after the repository is public and verified.

## Pre-Launch Verification

- [ ] Public mirror was created from an approved sanitized tree only.
- [ ] No private `.git` history, old private overlays, product repositories, secrets, local files, or old Actions logs were included.
- [ ] Runtime validation still reports exactly `5` active skills and `12` active agents.
- [ ] Public package validation passes in the public mirror.
- [ ] Toolkit validation and evals pass in the public mirror.
- [ ] Source freshness is clean or explicitly resolved in a reviewed source-record update.
- [ ] Leak findings are either absent, safe guardrail/scanner evidence, false positives, or owner-approved for publication.

## Stop Conditions

- Stop if any validation fails.
- Stop if source freshness reports actionable changes.
- Stop if leak scanning finds current-tree blockers.
- Stop if any product repository content, private overlay, secret, local path, or unapproved security contact appears in the public mirror.
- Stop if owner approval is incomplete.
