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
- The live source-capabilities registry has zero approved syntheses, so all
  regenerated live compiled agents honestly record empty synthesis provenance.

## Validation

- `node scripts/compile-agents.mjs --confirm-write` — PASS; 15 outputs
  regenerated, all `target-size`, no WARN or SKIP output.
- `node scripts/compile-agents.mjs --check` — PASS; all 15 outputs current,
  `provenance: verified`.
- `node --test scripts/test-compiler-provenance-parity.mjs scripts/test-compile-agents.mjs`
  — PASS; 33 tests, 0 failures, 0 skips.

The first sandbox-only focused-test attempt stopped before loading tests with
`spawn EPERM`; the approved host reruns above supplied the recorded evidence.
No runtime/embedded mirrors, release evidence, network resources, remote
state, activation, or product repositories were changed.
