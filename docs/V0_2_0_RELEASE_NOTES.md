# v0.2.0 Controlled Release Notes

## Scope

`v0.2.0` is a controlled Codex toolkit release after the v0.2 enterprise-style coding-time governance hardening and final release-candidate dry-run adoption check.

This release does not claim Level 4, Level 5, enterprise certification, production certification, automatic tool installation, CI wiring, MCP/global configuration, project-repository mutation, broad cross-runtime active support, package publication, or Codex OSS application submission.

## Included Evidence

- Final hardening merge: `069a2ce Finalize v0.2 enterprise readiness hardening`.
- Final release-candidate check merge: `0ec0b47 Finalize v0.2 release candidate checks`.
- Runtime gate remained canonical at 5 active skills and 12 active repo-local project agents.
- Source freshness passed with no actionable changes.
- Leak scan reported `0` current-tree blockers.
- React/TypeScript SaaS planner and apply dry-run were exercised against a temporary non-product target.
- `node scripts/compile-agents.mjs --dry-run` previewed 12 compiled-agent outputs with `size-ok`.
- `node scripts/compile-agents.mjs --confirm-write` regenerated only `compiled-agents/*.compiled.md`.
- `node scripts/ai-toolkit/build-embedded-package.mjs` regenerated the `.ai-toolkit` mirrors for toolkit version `0.2.0`.

## Release Boundaries

- No product repositories are touched.
- No package files or lockfiles are changed.
- No CI workflow, MCP config, deployment config, global/user Codex config, or external service config is changed.
- No tools are installed.
- No raw upstream source content is copied into active runtime paths.
- Recommended tools remain governed metadata unless a separate owner-approved project task installs or runs them.
- Historical v0.1.0 publication and Codex OSS application draft records remain historical evidence; this release does not submit the Codex OSS application.

## Validation Required Before Tag

Run and preserve the exact output for:

```powershell
git status --short
git diff --check
node scripts/compile-agents.mjs --dry-run
node install/tooling-plan.mjs --project-type react-typescript-saas
node install/tooling-apply.mjs --target ./tmp-v0.2-release-candidate-dry-run-target --project-type react-typescript-saas
node scripts/validate-project-tooling-profiles.mjs
node scripts/ai-toolkit/validate-codex-runtime.mjs
node scripts/validate-public-package.mjs
node scripts/validate-toolkit.mjs
node scripts/check-source-freshness.mjs --fail-on-change
node scripts/scan-public-private-leaks.mjs
node --test scripts/test-*.mjs
node scripts/ai-toolkit/validate-ai-toolkit.mjs
node scripts/ai-toolkit/validate-version-consistency.mjs
node scripts/ai-toolkit/run-toolkit-evals.mjs
```

Stop before tagging if runtime is not exactly 5 skills and 12 project agents, source freshness has actionable changes, leak scan has current-tree blockers, version consistency fails, validators fail, planner/apply output suggests product/package/CI/MCP/global mutation, or a hard restriction would be crossed.

## Rollback

If the release is found invalid before tagging, stop and fix through a normal PR. If the tag or GitHub release is created from the wrong commit, delete or supersede the release through an owner-approved GitHub release correction, remove the tag through normal reviewed repo operations, and publish a correction note that names the invalid commit and validation failure.
