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

## Recommended Next Step

Before tagging or releasing v0.2.0, run a controlled dry-run adoption against one target repository. The dry run should use the v0.2 profiles, task-intake routing gate, readiness methods, and no-fake-validation reporting without package changes, CI wiring, MCP/global config changes, external service changes, or product repository mutation.
