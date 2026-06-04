# Quality Gates Template

Owner must review before applying. Codex must not claim output unless the actual script or tool ran and produced current output. Package-manager changes require separate approval.

## Suggested Gates

- typecheck
- lint
- tests
- build
- browser evidence when UI behavior is in scope
- secret scan when security or release readiness is in scope
- dependency scan when manifests are in scope
- release/rollback review before merge readiness

## Reporting

Report commands run, outputs observed, missing scripts, skipped checks, WARN output, and residual risk. Planned, dry-run, metadata-only, or unavailable checks are not passing checks.
