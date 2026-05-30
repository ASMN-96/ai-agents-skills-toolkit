# Level 4 Promotion Evidence

Status: deferred. The toolkit is Level 3 complete, and Level 4 remains deferred until the evidence manifest and owner decision meet the Level 4 gate.

This document is an evidence ledger, not a promotion. It does not activate runtimes, install tools, change global configuration, modify product repositories, or approve broad rollout.

## Evidence Source

Structured evidence is recorded in `docs/LEVEL_4_PROMOTION_EVIDENCE.json`.

Audit command:

```powershell
node scripts/validate-level4-readiness.mjs
```

Promotion gate command:

```powershell
node scripts/validate-level4-readiness.mjs --require-ready
```

The default audit reports current readiness without failing the normal Level 3 validator. The `--require-ready` mode must fail until Level 4 evidence and owner approval exist.

## Current Position

- Current level: Level 3 complete.
- Target level: Level 4.
- Level 3 closeout: complete on the first successful representative pilot.
- Passed pilots counted so far: 1 of 3 required.
- Project types counted so far: 1 of 2 required.
- Warning threshold owner approval: missing.
- Rollback rehearsal evidence: missing.
- Enterprise external-tool metadata review: incomplete.
- Promotion owner approval: missing.

## Required Evidence

- Multiple project-pilot reports from representative project types.
- Every counted pilot must use clean upstream-aligned branches, dry-run-first sync, reviewed write scope, manifest validation, project checks, PR review, and passing CI.
- Warning thresholds must be owner-approved before broad rollout.
- Rollback rehearsal evidence must show the exact revert path and validation after rollback.
- Enterprise tool metadata must be reviewed by accountable owners for any tool used or described as approved.
- Unreviewed tools must remain metadata-only and blocked from enterprise approval.

## Non-Approval Rules

- A validator pass is support evidence, not promotion evidence by itself.
- Metadata-only tool entries are not enterprise-approved.
- A skipped, dry-run, fallback, planned, or held check must be reported as such.
- Level 4 does not authorize public release, runtime adapter activation, MCP setup, global config changes, package installs, or product-repository writes outside approved project PRs.

## Deferred Level 4 Evidence Backlog

1. Complete two additional representative project-sync pilots and record reports using `templates/level4-project-pilot-report.template.md`.
2. Record owner-approved warning thresholds using `templates/level4-warning-threshold-decision.template.md`.
3. Rehearse rollback on a low-risk project update and record evidence using `templates/level4-rollback-rehearsal-report.template.md`.
4. Review enterprise tool metadata by owner bucket using `templates/level4-enterprise-tool-review.template.md`.
5. Run `node scripts/validate-level4-readiness.mjs --require-ready` only when all evidence is present.
