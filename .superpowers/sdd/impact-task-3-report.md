# Impact Task 3 Report

## RED

Added dependency-scoped release-accounting tests before the implementation. The targeted run failed because `deriveSourceReleaseAccounting` did not expose capability-scoped actionability, exact blocking resources/gates, advisories, or a non-global blocking result.

## GREEN

- `node --test scripts/test-delivery-kernel-source-governance.mjs` passed: 26 tests, 0 failures.
- Release-evidence unit tests passed for capability-scoped wording and all non-candidate-consistency cases: 24 passed.
- `git diff --check` passed (the host reported its existing long-filename diagnostic while traversing an unrelated embedded receipt).

The release accounting now consumes an explicit capability-impact input plus selected resource, selected gate, and supported-gate IDs. It returns exact capability, resource, and gate blocker IDs; portfolio-actionable state; pinned-basis advisories; and `globalReleaseBlocked: false` so a scoped integration/gate block cannot be misreported as a portfolio-wide publication block.

Matrix coverage includes stale clean-room/adapted advisory handling, delegated selected-resource blocking, authoritative-baseline selected-supported-gate blocking, historical nonblocking behavior, and preview-gate isolation. The policy does not use source flags or global stale counts as the authority for capability-scoped outcomes.

Release-evidence validation now carries the derived capability-impact summary and prints exact capability/resource/gate IDs, portfolio-actionable count, and pinned-basis advisory count without changing the release-evidence record.

## Concerns

- `node scripts/validate-v0-3-release-evidence.mjs --check` remains blocked before capability accounting by the existing source-catalog artifact digest mismatch: expected `eb625fb41c0174201e6f2badae187e31b1ce7f9dba5bc64a3172c27e965772d5`, actual `0887f8904b215cc2a74d0ef7fc52802985de0509802fb19e402a88a83d77a7ca`. This task deliberately did not edit release evidence, generated artifacts, or source catalog records.
- The full `scripts/test-release-evidence.mjs` likewise has two blocked candidate-consistency tests for that same digest mismatch; all other 24 cases pass.
- No external-source activation, runtime routing change, generated-artifact update, release-evidence record update, product-repository action, browser QA, PR, or CI run occurred.

## Review Correction

### RED

Review found that the first implementation expected semantic capability-impact records that the canonical producer never emitted. The new producer assertion failed because `scopedImpacts` was absent. The release-validation test also failed because no canonical release-accounting entry point existed. The advisory wording test exposed that a `pinned-basis-advisories` label counted unrelated reference-only advisories.

### GREEN

- `source-capability-impact.mjs` now emits deterministic `scopedImpacts` records with exact source/capability IDs, contribution outcome, stale state, hard-security flag, exact gate/resource IDs, and portfolio-actionable state.
- Freshness validation accepts the required field, preserves legacy empty impact safely, and rejects malformed or incomplete non-empty capability impact.
- Release validation derives its selected supported gate IDs from the canonical domain-packs registry, consumes the canonical scoped records, and fails closed on missing scoped records for non-empty capability IDs.
- The new end-to-end release-validation test proves exact `security.authoritative-baseline` and `enterprise-security-privacy` blockers plus an adapted pinned-basis advisory. It also proves incomplete canonical impact is rejected.
- `pinned-basis-advisories` now counts only advisories containing `pinned reviewed basis`; reference-only advisories no longer inflate that metric.

### Correction checks

- `node --test scripts/test-source-capability-impact.mjs`: 16 passed.
- `node --test scripts/test-source-freshness-hardening.mjs`: 25 passed.
- `node --test scripts/test-delivery-kernel-source-governance.mjs`: 26 passed.
- `node --test scripts/test-release-evidence.mjs`: 25 passed; 2 candidate-consistency checks remain blocked by the unchanged source-catalog digest mismatch.
- `node scripts/validate-v0-3-release-evidence.mjs --check`: same unchanged digest mismatch; no evidence or generated artifact was edited.
- `git diff --check`: passed, with the existing unrelated long-filename diagnostic during Git traversal.

## Re-review Correction

### RED

The new release-validation regression supplied a stale delegated capability that named `tool.selected` in its scoped impact. With `tool.selected` selected by canonical release scope, the live release projection still returned `releaseBlocking: false` because it hardcoded an empty selected-resource list. The focused test failed at that assertion before implementation.

### GREEN

- Release validation now accepts selection only from the release-evidence-owned `releaseScope.selectedResourceIds` record; it does not use a source report's aggregate `releaseBlocking` or `blockingResourceIds` claims.
- Every selected ID is independently checked against the canonical resource set assembled from the current agents, skills, and tools registries. Missing scope, malformed/duplicate IDs, or unknown IDs fail closed.
- The regression covers a selected delegated integration that blocks, an unselected delegated integration that remains advisory, an empty optional selection, forged aggregate source claims, and absent/unknown release-scope evidence.
- The current release-evidence artifact deliberately remains untouched. Because it has no `releaseScope` record, validation will fail closed on that missing policy evidence once the pre-existing digest drift is separately reconciled.

### Correction checks

- `node --test scripts/test-release-evidence.mjs`: 26 passed. The two candidate-consistency tests remain blocked only by the unchanged source-catalog digest mismatch.
- `git diff --check`: passed, with the existing unrelated long-filename diagnostic during Git traversal.
