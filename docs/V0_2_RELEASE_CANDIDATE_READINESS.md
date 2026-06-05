# v0.2 Release Candidate Readiness

## Position

The toolkit is ready for controlled open-source Codex use as a v0.2 release candidate when the validation gate passes on this branch and after post-merge verification passes on `main`.

This is enterprise-style coding-time governance: task intake, routing, readiness gates, project-tooling boundaries, validation honesty, and controlled evidence reporting.

## Explicit Non-Claims

This release-candidate position is not:

- Level 4 readiness;
- Level 5 readiness;
- enterprise-certified;
- production-certified;
- broad cross-runtime active support;
- automatic tool installation;
- CI wiring;
- MCP or global configuration;
- project repository mutation;
- package publication;
- a v0.2.0 tag;
- a GitHub release.

In plain language: this is not Level 4, not Level 5, not enterprise-certified, not cross-runtime active support, and not automatic tool installation.

## Current Readiness Gates

- Normal-language tasks are classified before coding through `methods/governance/task-intake-routing-gate.md`.
- Coding-time readiness methods exist for production-style governance, API contracts, performance/cache risk, observability, application security, and release rollback.
- Project tooling remains metadata and template guidance only.
- Recommended tools are separated from executed tools.
- Dry-run, skipped, unavailable, metadata-only, planned, and partial checks are not reported as real execution.
- WARN output remains visible in completion reports.

## Resource Boundary

- No current-scope `pilot-only` project-tooling classification remains.
- code-review-graph is active-read-only source intelligence.
- open-design is active-reference design intelligence.
- eslint-plugin-boundaries is active-install-if-project-type only after architecture layers are stable and owner-approved.
- Impeccable normalized guidance remains active-reference; project-local install mode is approval-required.
- Base UI and Figma are excluded from current v0.2 recommendations.

## Final Pre-Release Check - 2026-06-05

This check ran on `main` after the v0.2 hardening merge `069a2ce Finalize v0.2 enterprise readiness hardening`.

- Task intake routing was used before implementation. The affected surfaces were release evidence docs, generated source/leak reports, project-tooling planner/apply dry-run output, and validation evidence.
- Runtime remained exactly `5 skills, 12 project agents` by `node scripts/ai-toolkit/validate-codex-runtime.mjs`.
- Live source freshness passed with `UNCHANGED 19`, `REVIEWED_HELD 2`, and `CHECK_FAILED 0`; the committed `docs/SOURCE_FRESHNESS_REPORT.md` was refreshed only through `node scripts/check-source-freshness.mjs --output docs/SOURCE_FRESHNESS_REPORT.md --fail-on-change`.
- Public/private leak scan reported `Current-tree blockers: 0`.
- Controlled dry-run adoption used `node install/tooling-plan.mjs --project-type react-typescript-saas` and `node install/tooling-apply.mjs --target ./tmp-v0.2-release-candidate-dry-run-target --project-type react-typescript-saas`.
- The apply command stayed in dry-run mode and reported template files it would copy into `<target>/.ai-toolkit/tooling/`; it did not write to a product repository.
- No tools were installed, no package files or lockfiles were changed, no CI was wired, no MCP/global/deployment config changed, no external service was configured, no product repo was touched, and no tag or GitHub release was created.

## Recommended Next Step

The controlled owner-approved adoption decision has been made for the v0.2.0 release process using the controlled dry-run adoption evidence above. This document remains the release-candidate evidence record; the release execution record is `docs/V0_2_0_RELEASE_NOTES.md`.

Any v0.2.0 tag or GitHub release must be created only from validated `main` after the release branch merges. The release must not claim Level 4, Level 5, enterprise certification, production certification, automatic tool installation, broad cross-runtime active support, or project-repository mutation.
