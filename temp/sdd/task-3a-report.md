# Task 3A report — canonical dependency-scoped source model

## RED/GREEN

- RED: `node scripts/test-source-scope-model.mjs` initially failed for the missing scope derivation API, 2.1 schema contract, graph validator, and v2.0-to-v2.1 migration export.
- Repair RED: `node scripts/test-source-governance-v2.mjs` rejected stale 2.0 fixture catalogs with `schemaVersion must be 2.1.0`.
- Repair RED: `node scripts/test-delivery-kernel-source-governance.mjs` failed 6 assertions because temporary repositories omitted the canonical domain-pack and tool graph inputs required by runtime scope validation.
- GREEN: `node scripts/test-source-scope-model.mjs` passed 4/4 focused tests.
- GREEN: `node scripts/test-source-governance-v2.mjs` passed 19/19 tests with schema 2.1 fixture catalogs and an explicit release-blocker assertion for generated drift.
- GREEN: `node scripts/test-delivery-kernel-source-governance.mjs` passed 18/18 tests; its explicit graph fixtures preserve `core` reference eligibility without enabling runtime use.
- GREEN: `node scripts/test-version-consistency.mjs` passed 1/1 and enforces deferred generated-mirror drift as a release-validation failure.
- GREEN: `git diff --check` passed.

## Classification

- core: 8 — `nist-ai-rmf-genai`, `nist-ssdf`, `nist-ssdf-ai`, `openssf-ai-code-assistant-instructions`, `owasp-agentic-applications`, `owasp-asvs`, `owasp-llmsvs`, `slsa-v1-2`
- platform-preview: 12
- optional-tool: 38
- community-reference: 22
- historical: 0 active records (the graph validates historical precedence and forbidden dependency rules with fixtures).

All 80 active records have exactly one legal scope.

## Migration and drift

- Governed migration: `node scripts/migrate-source-catalog-v2.mjs --confirm-write` returned `migrated-v2.1`, 80 sources, schema `2.1.0`.
- Migration preserves monitor/review state and rejects retired portfolio IDs; no retired identity was restored.
- Expected generated drift is intentionally present: `.ai-toolkit/sources/watchlist.json` and downstream freshness/release artifacts remain generated-only for Task 7 convergence. This drift is an enforced release blocker: `validate-source-governance` must reject it, and no release profile may normalize or ignore it.

## Concerns

- Windows sandbox execution can block required local `fsutil.exe`/Git child-process checks with `spawn EPERM`; focused suites must be rerun with those local checks available before completion is claimed.
