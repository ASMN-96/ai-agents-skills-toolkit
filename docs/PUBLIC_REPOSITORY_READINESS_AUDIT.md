# Public Repository Readiness Audit

Status: blocked. This audit does not approve publication.

## Scope

This audit covers public GitHub repository readiness for the whole repository tree and known history risk. It is broader than public package validation.

`node scripts/validate-public-package.mjs` remains useful, but it is allowlist-only. It validates the explicit public package surface and does not prove the full repository tree, Git history, branches, tags, or historical generated reports are safe for public visibility.

## Current Runtime Boundary

- Active skills: exactly 5 canonical skills.
- Active project agents: exactly 12 repo-local agents.
- Removed aliases are not active runtime skills.
- Level 4 remains blocked/deferred.
- Level 5/public release remains blocked.

## Findings

| File/path | Finding | Risk | Action taken | Owner decision needed |
| --- | --- | --- | --- | --- |
| `.ai-toolkit/private-overlays/riss-v2/` | Private RISS V2-specific overlay content existed in the current public repo tree. | blocker | Removed from current tree. | If still needed, keep it only in a separate private repository or private branch. Do not reintroduce it into a public path. |
| Repository Git history | Removed private overlay content may still exist in historical commits. | blocker | Documented the history exposure risk. | Publish from a clean sanitized repository/mirror or perform and verify Git history cleanup before changing visibility. |
| `docs/PUBLIC_PRIVATE_LEAK_REPORT.md` | Leak scan is report-only and now lists 87 findings across the whole tree: 0 current-tree blockers, 9 history-only blockers, 10 owner-decision blockers, 64 safe guardrail/scanner evidence findings, and 4 false positives. The earlier baseline was 221 findings, including 51 private-overlay findings. | blocker | Neutralized current-tree metadata and docs references, regenerated the scan, and kept publication blocked instead of treating allowlist validation as whole-repo approval. Scanner detection rules were preserved. | Resolve history-only and owner-decision blockers, or publish only from an approved sanitized mirror. |
| `docs/PUBLICATION_REVIEW.md` | Publication decision is now explicitly blocked pending owner decisions. | acceptable | Added owner-decision table. | Keep updated until publication is either rejected or approved through a separate decision. |
| `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` | Required stale alias compatibility claims needed correction after PR #52. | blocker | Updated to canonical-only runtime and stricter Level 5 blockers. | Owner must approve final Level 5 criteria and policy docs before any public release. |
| `docs/PUBLIC_RELEASE_CHECKLIST.md` | Public checklist needed canonical-only runtime and whole-repo/history gates. | blocker | Updated checklist language. | Complete every listed gate before publication. |
| Policy files | License, contribution, conduct, and security files exist but are not owner/legal/community/security approved for public release in this audit. | blocker | Left publication blocked. | Owner approval for license posture, contribution process, community standard, supported scope, and vulnerability reporting channel. |
| Clean-clone verification | No clean-clone publication candidate verification was performed in this follow-up. | blocker | Left publication blocked. | Run clean-clone verification only after tree and history blockers are resolved. |
| Guardrail scripts/tests | Retired old-name literals remain in rejection/removal guardrails and leak-scan patterns. | acceptable | Kept guardrails so old aliases do not become active again. | No publication blocker if clearly documented as guardrails and not active runtime. |

## Owner Decisions Required

- Keep the repository private, or publish only from a clean sanitized mirror.
- Decide whether to perform Git history cleanup and how to verify it.
- Approve or reject any remaining whole-tree findings from `node scripts/scan-public-private-leaks.mjs`.
- Approve license, contribution, code-of-conduct, and security disclosure channel.
- Approve clean-clone verification commands and evidence.
- Approve any future Level 5/public release decision separately.

## Non-Approval Statement

This audit does not make the repository public, does not approve public package publication, does not approve Level 4 or Level 5, and does not authorize changes to GitHub visibility, release tags, product repositories, global/user Codex files, package files, lockfiles, CI, MCP, deployment config, or external services.

Public package validation is a package-surface check only. It must not be treated as whole-repository readiness while history-only or owner-decision blockers remain.
