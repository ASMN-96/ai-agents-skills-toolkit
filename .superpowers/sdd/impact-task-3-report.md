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
