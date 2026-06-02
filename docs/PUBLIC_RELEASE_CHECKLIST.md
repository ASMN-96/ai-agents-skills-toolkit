# Public Release Checklist

This checklist is a release gate. It does not publish artifacts or approve distribution by itself.

- Public package allowlist is explicit.
- `node scripts/validate-public-package.mjs` passes.
- Whole-repo publication review is clean; public package validation is allowlist-only and does not certify repository history.
- Full public/private leak scan has zero unresolved public-package blockers.
- Private overlay content is absent from the current public repo tree and public package output.
- Historical Git exposure for deleted private overlay content is resolved by clean sanitized repository/mirror or verified history cleanup.
- Public runtime is canonical-only: 5 active skills and 12 active repo-local project agents.
- License, contribution, conduct, and security policy files are present.
- License, contribution, conduct, and security disclosure channel are owner-approved.
- Source freshness has no high-risk or review-required changes.
- Compiled agents are generated from the deterministic compiler or known drift is explicitly blocked from release.
- Release notes state maturity level, validation evidence, WARN output, exclusions, and rollback.
- Clean-clone verification has been run from documented commands before public distribution.

## Clean-Clone Verification

Run this only after owner approval to verify public-release reproducibility from a fresh checkout:

1. Clone the candidate branch into a temporary directory.
2. Run `node scripts/validate-public-package.mjs`.
3. Run `node scripts/compile-agents.mjs --dry-run`.
4. Run `node scripts/validate-toolkit.mjs`.
5. Run `node scripts/ai-toolkit/validate-ai-toolkit.mjs`.
6. Run `node scripts/ai-toolkit/validate-codex-runtime.mjs`.
7. Run `node scripts/ai-toolkit/validate-version-consistency.mjs`.
8. Run `node scripts/ai-toolkit/run-toolkit-evals.mjs`.
9. Run `git diff --check`.

Do not publish if any command fails, if generated artifacts drift, or if the public package validator reports private markers.

Clean-clone verification does not resolve historical Git exposure by itself. If private content ever existed in repository history, owner must publish from a clean sanitized repository/mirror or perform and verify history cleanup before changing visibility.
