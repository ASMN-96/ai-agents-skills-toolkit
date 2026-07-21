# Privileged Host Execution Bridge Contract

The delivery kernel can safely plan from repository data and can validate the
shape and consistency of serialized events and receipts. It cannot treat those
files as proof that Codex, Claude Code, a tool, or a human approver actually ran.

## Current v0.3 boundary

- v0.3 ships a fail-closed bridge contract for plan, event, and receipt-shape validation. It is a `preview-contract`, not an available trusted host runtime: standalone JSON cannot mint trusted readiness.
- Even an `available` bridge value in ReleaseEvidence remains self-declared and cannot establish trusted readiness; that requires host-owned, verifiable attestation outside repository-controlled JSON.
- `plan` re-derives gates, resources, waves, ownership, and verifier policy from
  the canonical registries.
- `ingest-events` re-runs that planning policy before accepting a serialized
  plan and reports progress or blockers.
- `finalize` validates event and receipt relationships, but standalone file
  input always includes `untrusted-evidence-issuer` and cannot reach
  `verified-for-review` or `verified-for-release`.
- No public kernel function can mint trusted execution or owner-approval
  authority.
- No trusted host-owned root execution principal exists yet. The Architect is
  therefore the fixed read-only accountable lead, including for low-risk
  read-only work; it cannot be converted into or replaced by a fabricated
  workspace-write root agent.
- A scoped write must route to a canonical implementation writer preferred by
  the scenario or matched to explicit platform/framework intent. If none is
  eligible, planning blocks before assignments instead of deferring the writer
  failure to execution.

This fail-closed contract is intentional until an available runtime-owned bridge
is integrated and independently tested. It does not establish a production-proven
or enterprise-impact claim.

## Required bridge behavior

A Codex or Claude Code host bridge must run outside project-controlled code and
must independently observe and bind all of the following to one canonical plan:

1. runtime and invocation identity;
2. host-clock start and completion timestamps;
3. assignment-specific prompt, context, and input hashes;
4. selected resource, adapter, authorized action, and exact tool-parameter hashes;
5. the effective sandbox mode and proof that it is no broader than assignment ownership;
6. tool calls, exit status, and captured output bytes and hashes;
7. repository commit plus the observed changed-path set;
8. source-freshness state at the time of execution;
9. a fresh receipt-bound verifier context after every writer, including the exact writer output and changed-path evidence;
10. separately authenticated owner approval when a gate requires owner review.

No recursive delegation is allowed. Selected specialists may not delegate or
spawn recursively unless a later policy introduces a separately reviewed finite depth,
authenticated child identity, independent ownership, and explicit host enforcement.

The bridge must return a one-use, non-serializable capability bound to the plan,
event, and receipt digests. A process-local capability is acceptable only when
project code cannot import or execute in the minting process. Otherwise the
bridge requires process isolation and authenticated IPC or an equivalent host
security boundary.

## Promotion gate

Do not enable verified readiness until adversarial integration tests prove that
forged JSON, a re-hashed plan, a wrong commit, altered output, stale or
pre-write verifier context, a sandbox broader than assigned ownership, altered
action or input parameters, recursive delegation, uninvoked resources,
overlapping writers, an unqualified verifier, and an unauthenticated approver
all remain blocked.
