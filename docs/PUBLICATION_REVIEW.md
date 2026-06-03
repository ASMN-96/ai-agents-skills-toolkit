# Publication Review

Status: published path selected and active; controlled `v0.1.0` release is allowed only after the release PR, validation gate, post-merge verification, tag creation, and GitHub release verification pass. Level 5 broad public/package maturity remains a separate future approval.

This review is separate from `node scripts/validate-public-package.mjs`. Public package validation is allowlist-only: it checks the explicit package surface, not every repository file and not Git history. A public GitHub repository readiness review covers the whole tree, historical exposure, branch/tag state, policy files, disclosure channels, and owner approval.

## Current Decision

- Current repository visibility: public.
- Public package readiness: valid for allowlist package surface only.
- Public GitHub repository readiness: published on this path after owner history-disclosure acceptance; residual owner/history findings are accepted only for the controlled `v0.1.0` path and remain tracked for future Level 5 maturity.
- Level 4 and Level 5 readiness: not claimed.

## Findings

| File/path | Finding | Risk | Action taken | Owner decision needed |
| --- | --- | --- | --- | --- |
| `.ai-toolkit/private-overlays/riss-v2/` | RISS V2-specific private overlay existed in the public repo tree. | blocker | Removed from the current tree. Content was not moved or copied into another public path. | Decide whether any private overlay content is still needed in a separate private repository or private branch. |
| Git history for `.ai-toolkit/private-overlays/riss-v2/` | Deleting the directory from the current tree does not erase historical Git exposure. | blocker | Added this publication note and recorded owner acceptance of visible history for Codex OSS review. | Keep the current repository public with intentional history visibility and re-review any future disclosure expansion. |
| Whole repository tree | Public package validation is allowlist-only and does not certify the full repository for public visibility. | blocker | Added this review and `docs/PUBLIC_REPOSITORY_READINESS_AUDIT.md`. | Complete whole-repo publication review, including generated docs, historical reports, source records, templates, runtime artifacts, and scripts. |
| `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` | Stale Level 5 language implied alias compatibility remained part of the public readiness path. | blocker | Updated the rollout gate to canonical-only runtime language. | Approve the final Level 5 criteria only after whole-repo review, history decision, clean-clone verification, and policy approval. |
| `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` | Policy files exist, but owner/legal/community/security disclosure approval is still required before publication. | blocker | Kept as launch condition. | Approve license, contribution, community, and vulnerability disclosure channel. |
| Clean clone | Clean-clone publication verification has not been run for a separate sanitized-mirror candidate. | acceptable | For current-path public repository operation, this review records owner acceptance of visible history. | Run mirror verification only if a separate public candidate is created. |
| `docs/PUBLIC_PRIVATE_LEAK_REPORT.md` | Whole-tree leak scan now reports 87 findings: 0 current-tree blockers, 9 history-only blockers, 10 owner-decision blockers, 64 safe guardrail/scanner evidence findings, and 4 false positives. The earlier baseline was 221 findings, including 51 private-overlay findings. | blocker | Neutralized current-tree metadata and kept historical references explicit while preserving scanner rules. | Ensure history-only and owner-decision findings follow the approved owner publication path. |
| Retired skill aliases | Old names remain only in migration documentation and guardrail scripts/tests that reject old aliases. | acceptable | Active runtime remains canonical-only. | No action unless owner wants additional historical wording cleanup outside this PR. |

## Publication Rule

Do not change GitHub visibility, create release tags beyond the approved `v0.1.0`, or publish package artifacts until:

- the full release PR validation gate passes,
- post-merge verification passes on `main`,
- leak scan reports `0` current-tree blockers,
- source freshness has no actionable changes,
- runtime validation reports the canonical Codex surface,
- security disclosure channel is owner-approved,
- release notes state the exact controlled-use posture, exclusions, WARN output, and rollback path.

Passing public package validation does not approve Level 5 readiness by itself. If leak findings remain, they must be classified and explicitly accepted through the owner decision process for the controlled `v0.1.0` path.
