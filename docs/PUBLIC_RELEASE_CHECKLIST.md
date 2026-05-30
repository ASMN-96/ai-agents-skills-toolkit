# Public Release Checklist

This checklist is a release gate. It does not publish artifacts or approve distribution by itself.

- Public package allowlist is explicit.
- `node scripts/validate-public-package.mjs` passes.
- Full public/private leak scan has zero unresolved public-package blockers.
- Private overlay content is excluded from public package output.
- Generic public skill aliases are active and compatibility names remain tested during the migration window.
- License, contribution, conduct, and security policy files are present.
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
