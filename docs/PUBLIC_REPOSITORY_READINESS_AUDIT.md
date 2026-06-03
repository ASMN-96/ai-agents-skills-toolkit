# Public Repository Readiness Audit

Status: repository is public with owner-approved visibility; this audit tracks controlled `v0.1.0` release evidence separately from future Level 5 broad public/package maturity.

## Scope

This audit covers public GitHub repository readiness for the whole repository tree and known history risk. It is broader than public package validation.

`node scripts/validate-public-package.mjs` remains useful, but it is allowlist-only. It validates the explicit public package surface and does not prove the full repository tree, Git history, branches, tags, or historical generated reports are safe for public visibility.

## Current Runtime Boundary

- Active skills: exactly 5 canonical skills.
- Active project agents: exactly 12 repo-local agents.
- Removed aliases are not active runtime skills.
- Level 4 remains blocked/deferred.
- Controlled `v0.1.0` release may proceed only after the full validation, PR, post-merge, tag, and GitHub release gates pass.
- Level 5 broad public/package maturity remains blocked pending explicit policy and owner-decision closure.

## Findings

| File/path | Finding | Risk | Action taken | Owner decision needed |
| --- | --- | --- | --- | --- |
| `.ai-toolkit/private-overlays/riss-v2/` | Private RISS V2-specific overlay content existed in historical commits. | blocker | Removed from current tree. | If still needed, keep it only in a separate private repository or private branch. Do not reintroduce it into a public path. |
| Repository Git history | Removed private overlay content may still exist in historical commits. | blocker | Documented the history exposure risk. | Publish from a clean sanitized repository/mirror when creating candidates, or apply owner-approved history disclosure controls for this public path. |
| `docs/PUBLIC_PRIVATE_LEAK_REPORT.md` | Leak scan is report-only and now lists 87 findings across the whole tree: 0 current-tree blockers, 9 history-only blockers, 10 owner-decision blockers, 64 safe guardrail/scanner evidence findings, and 4 false positives. The earlier baseline was 221 findings, including 51 private-overlay findings. | blocker | Neutralized current-tree metadata and docs references, regenerated the scan, and kept publication evidence explicit instead of treating allowlist validation as whole-repo approval. Scanner detection rules were preserved. | Keep history-only and owner-decision findings under the active owner publication path. |
| `docs/PUBLICATION_REVIEW.md` | Publication decision is active under owner-approved public visibility. | acceptable | Added owner-decision table. | Keep updated until publication is either rejected or approved through a separate decision. |
| `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` | Required stale alias compatibility claims needed correction after PR #52. | blocker | Updated to canonical-only runtime and stricter Level 5 blockers. | Owner must approve final Level 5 criteria and policy docs before any broad public/package maturity claim. |
| `docs/PUBLIC_LAUNCH_CHECKLIST.md` | Launch checklist still referenced mirror-only publication steps. | blocker | Updated checklist language for current public-path execution. | Complete every listed gate before release actions. |
| Policy files | License, contribution, conduct, and security files exist but are not owner/legal/community/security approved for public release in this audit. | blocker | Kept as launch conditions pending owner approval. | Owner approval for license posture, contribution process, community standard, supported scope, and vulnerability reporting channel. |
| Clean-clone verification | No clean-clone publication candidate verification was performed in this follow-up. | blocker | Kept as optional follow-up for mirror candidates only. | Run clean-clone verification only if a separate candidate repository is created. |
| Guardrail scripts/tests | Retired old-name literals remain in rejection/removal guardrails and leak-scan patterns. | acceptable | Kept guardrails so old aliases do not become active again. | No publication blocker if clearly documented as guardrails and not active runtime. |

## Owner Decisions Required

- Keep this repository in its approved public path, or publish future candidates only from a clean sanitized mirror.
- Decide whether to perform Git history cleanup and how to verify it.
- Approve or reject any remaining whole-tree findings from `node scripts/scan-public-private-leaks.mjs`.
- Approve license, contribution, code-of-conduct, and security disclosure channel.
- Approve clean-clone verification commands and evidence for any future broad distribution path.
- Approve any future Level 5 maturity decision separately.

## Non-Approval Statement

This audit supports the controlled `v0.1.0` release only when the release PR and post-merge gates pass. It does not approve Level 4 or Level 5, product repositories, global/user Codex files, package files, lockfiles, CI, MCP, deployment config, external services, or Codex OSS application submission.

Public package validation is a package-surface check only. It must not be treated as whole-repository readiness while history-only or owner-decision blockers remain.
