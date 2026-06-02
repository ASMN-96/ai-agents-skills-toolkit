# Publication Review

Status: blocked. This repository must remain private until owner review resolves whole-tree and Git history risks.

This review is separate from `node scripts/validate-public-package.mjs`. Public package validation is allowlist-only: it checks the explicit package surface, not every repository file and not Git history. A public GitHub repository readiness review covers the whole tree, historical exposure, branch/tag state, policy files, disclosure channels, and owner approval.

## Current Decision

- Current repository visibility: keep private.
- Public package readiness: not approved by this review.
- Public GitHub repository readiness: blocked.
- Level 4 and Level 5 readiness: not claimed.

## Findings

| File/path | Finding | Risk | Action taken | Owner decision needed |
| --- | --- | --- | --- | --- |
| `.ai-toolkit/private-overlays/riss-v2/` | RISS V2-specific private overlay existed in the public repo tree. | blocker | Removed from the current tree. Content was not moved or copied into another public path. | Decide whether any private overlay content is still needed in a separate private repository or private branch. |
| Git history for `.ai-toolkit/private-overlays/riss-v2/` | Deleting the directory from the current tree does not erase historical Git exposure. | blocker | Added this publication note and kept the repository private. | Choose either a clean sanitized repository/mirror for publication or perform and verify history cleanup before changing visibility. |
| Whole repository tree | Public package validation is allowlist-only and does not certify the full repository for public visibility. | blocker | Added this review and `docs/PUBLIC_REPOSITORY_READINESS_AUDIT.md`. | Complete whole-repo publication review, including generated docs, historical reports, source records, templates, runtime artifacts, and scripts. |
| `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` | Stale Level 5 language implied alias compatibility remained part of the public readiness path. | blocker | Updated the rollout gate to canonical-only runtime language. | Approve the final Level 5 criteria only after whole-repo review, history decision, clean-clone verification, and policy approval. |
| `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` | Policy files exist, but owner/legal/community/security disclosure approval is still required before publication. | blocker | Kept publication blocked. | Approve license, contribution, community, and vulnerability disclosure channel. |
| Clean clone | Clean-clone publication verification has not been run for a public repository candidate. | blocker | Kept publication blocked. | Run clean-clone verification after the repository tree and history decision are resolved. |
| `docs/PUBLIC_PRIVATE_LEAK_REPORT.md` | Whole-tree leak scan currently reports 221 findings, including 51 `move-to-private-overlay` findings. | blocker | Regenerated the scan and left publication blocked. | Review each finding class and decide what must be rewritten, excluded, archived, or accepted before any visibility change. |
| Retired skill aliases | Old names remain only in migration documentation and guardrail scripts/tests that reject old aliases. | acceptable | Active runtime remains canonical-only. | No action unless owner wants additional historical wording cleanup outside this PR. |

## Publication Rule

Do not make this repository public, change GitHub visibility, create public release tags, or publish package/repository artifacts until:

- whole-repo publication review is clean,
- private overlay and history exposure decisions are resolved,
- clean-clone verification passes,
- owner approves license, contribution, security, and community docs,
- security disclosure channel is owner-approved,
- Level 5/public release is explicitly approved in a separate reviewed decision.
