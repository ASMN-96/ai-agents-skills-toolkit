# Profiles

Profiles describe reusable operating bundles used when selecting compiled agents for a project or review context.
Profile artifacts are file-backed markdown documents under `profiles/*.md`.

Profiles may include agent selection, default mode, allowed actions, forbidden actions, support tools, output expectations, and verification gates.

Profiles should not contain secrets.

## Phase 4 Profiles

- `audit-profile.md`: read-only source, safety, review, and QA evaluation.
- `implementation-profile.md`: scoped implementation with architecture, frontend, backend, database, QA, and review coverage.
- `frontend-profile.md`: frontend implementation with UI/UX, QA, review, and security gates.
- `backend-profile.md`: backend contract and data access implementation with security and QA gates.
- `uiux-profile.md`: UI/UX review using Frontend, Product, QA, and Reviewer handoff.
- `security-profile.md`: security and supply-chain review.
- `sre-profile.md`: reliability, performance, observability, and release-readiness review.
- `release-profile.md`: PR, CI, changelog, release gate, and merge readiness review.

Profiles do not install or activate anything. Phase 5 added dry-run-first project sync workflows, and Phase 10A/10B indexes existing profiles in `registries/profiles.registry.json` for routing metadata only.
