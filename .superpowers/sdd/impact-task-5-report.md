# Impact Task 5 Report: Compiled Provenance Binding

## Status

Complete locally. This task binds each compiled agent only to approved synthesis
artifacts it actually consumes through the established compiler contract:

- `compiledMethodRefs` resolve `method:*` artifacts.
- `ownedSkills` and `secondarySkills` resolve `skill:*` artifacts.
- Undeclared tool and gate fields are ignored; this task does not create a new
  selector contract for them.

The compiler records sorted `capabilityIds`, `synthesisIds`, and `decisionRefs`
in compiled metadata and includes the selected provenance record in the
canonical input digest. A changed unrelated synthesis leaves an unaffected
compiled agent byte-identical.

## Fail-Closed Behavior

- Missing synthesis state, duplicate synthesis/decision/artifact identifiers,
  malformed artifact bindings, dangling decision references, and dangling
  consumed provenance are rejected.
- Synthesis states accept only the canonical `draft`, `approved`, and
  `superseded` values. Draft/superseded artifacts never contribute, and a
  selected artifact available only through them is rejected as unapproved.
- Decision-to-artifact links are validated in both directions for every
  synthesis, including unconsumed entries; decision and artifact IDs are unique
  across the full registry.
- The live source-capabilities registry has zero approved syntheses, so all
  regenerated live compiled agents honestly record empty synthesis provenance.

## Validation

- `node scripts/compile-agents.mjs --confirm-write` — PASS; 15 outputs
  regenerated, all `target-size`, no WARN or SKIP output.
- `node scripts/compile-agents.mjs --check` — PASS; all 15 outputs current,
  `provenance: verified`.
- `node --test scripts/test-compiler-provenance-parity.mjs scripts/test-compile-agents.mjs`
  — PASS; 33 tests, 0 failures, 0 skips.

## Review Correction

- `node --test scripts/test-compiler-provenance-parity.mjs` — PASS; 9 tests,
  0 failures, 0 skips. Covers unsupported state, dangling unconsumed decision
  artifact, selected draft provenance, and cross-synthesis duplicate IDs.
- `node --test scripts/test-compile-agents.mjs` — PASS; 28 tests, 0 failures,
  0 skips.

One combined test invocation completed 36 of 37 tests and failed only because
the parity preview child process crossed its fixed 30-second timeout after the
fixture-heavy companion suite had run. The standalone parity and compiler
runs above are the authoritative passing correction evidence.

The first sandbox-only focused-test attempt stopped before loading tests with
`spawn EPERM`; the approved host reruns above supplied the recorded evidence.
No runtime/embedded mirrors, release evidence, network resources, remote
state, activation, or product repositories were changed.
