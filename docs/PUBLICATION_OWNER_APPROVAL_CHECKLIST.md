# Publication Owner Approval Checklist

Status: owner approval recorded for making the current toolkit repository public, subject to clean final validation. This checklist does not create a release or submit the Codex open-source application.

## Owner Decision Entry - 2026-06-03

- Owner approves making the current toolkit repository public instead of publishing a sanitized mirror.
- Owner accepts that real PR and commit history is intentionally visible for OpenAI Codex OSS review.
- Owner confirms no current-tree blockers remain after final validation.
- Owner accepts the classified non-current-tree findings for this launch path: safe guardrail/scanner evidence, owner-decision blockers, history-only blockers, and false positives.
- Owner confirms all other repositories remain private unless separately approved; any pre-existing public repository detected during validation is out of scope and must not be modified by this task.
- Owner confirms no release tag or Codex OSS application submission is approved in this task.
- Owner confirms the security disclosure path must be GitHub private vulnerability reporting if available, or an owner-approved contact later.
- Owner confirms this approval applies only to this repository and does not approve changes to any other repository, profile repository, global/user Codex config, package files, lockfiles, CI, MCP, deployment config, external services, releases, tags, or product repositories.

## Verification Baseline

- Verified branch baseline: `main` at `1a7eaf6`, the PR #53 merge commit.
- Runtime gate: `5` active skills and `12` active project agents.
- Public package validation: passing.
- Toolkit validation and evals: passing.
- Leak scan: `87` classified findings, with `0` current-tree blockers, `9` history-only blockers, `10` owner-decision blockers, `64` safe guardrail/scanner findings, and `4` false positives.
- Source freshness: initial gate found `impeccable` as `CHANGED_LOW_RISK`; this branch refreshes the source record to the checked upstream default branch after read-only review.

## Publication Path Decision Memo

### Option A - Recommended: Sanitized Public Mirror / New Repo

- Export the approved current tree only into a clean public mirror.
- Do not include the private repository `.git` history.
- Do not include old private overlays.
- Do not include product repository content.
- Do not include old private Actions logs, PR discussion history, branches, or tags.
- Keep all other repositories private unless separately approved.
- Use this path for lower disclosure risk and a cleaner Codex OSS application story.

### Option B - Make Current Private Repo Public

- Requires owner acceptance of existing Git history exposure, or a verified history cleanup before visibility changes.
- Must account for old commits, branches, tags, PRs, and Actions logs.
- Carries higher disclosure risk because deleted private overlay history and generated historical reports may remain discoverable.
- Should not be used unless the owner explicitly accepts the residual risk or approves a full history cleanup and verification pass.

Recommendation: approve Option A. It preserves the current private repository as the controlled working source and publishes only a clean, owner-approved mirror.

## Security Disclosure Path

Preferred path: enable GitHub private vulnerability reporting on the public mirror if available for the repository. If it is not available, add an owner-approved security contact later. Do not invent or publish a security email without owner approval.

## Owner Approval Checklist

- [ ] Approve publication path: sanitized mirror/new repo instead of changing current private repo visibility.
- [ ] Approve any remaining classified leak findings or require additional cleanup.
- [ ] Approve the clean public candidate result.
- [ ] Approve the MIT license posture.
- [ ] Approve `CONTRIBUTING.md`.
- [ ] Approve `CODE_OF_CONDUCT.md`.
- [ ] Approve `SECURITY.md`.
- [ ] Approve security disclosure channel: GitHub private vulnerability reporting if available, or an owner-approved contact later.
- [ ] Confirm only the approved `ai-agents-skills-toolkit` public mirror will become public.
- [ ] Confirm all other repositories remain private unless separately approved.
- [ ] Approve GitHub topic: `ai-agents`.
- [ ] Approve GitHub topic: `codex`.
- [ ] Approve GitHub topic: `openai`.
- [ ] Approve GitHub topic: `developer-tools`.
- [ ] Approve GitHub topic: `maintainer-tools`.
- [ ] Approve GitHub topic: `automation`.
- [ ] Approve GitHub topic: `software-governance`.
- [ ] Approve GitHub topic: `release-engineering`.
- [ ] Approve `v0.1.0` release only after the repository is public and verified.
- [ ] Approve Codex OSS application submission only after the repository is public and verified.

## Non-Approval Statement

This approval does not authorize changing GitHub profile visibility, editing a profile README repository, creating release tags, submitting the Codex OSS application, modifying product repositories, touching global/user Codex config, or modifying package, lockfile, CI, MCP, deployment, or external service configuration.
