# Enterprise Delivery Kernel

The enterprise delivery kernel turns an engineering request into a bounded, evidence-oriented delivery plan for AI coding agents. It is a local decision layer, not an autonomous platform: it recommends resources and gates, but it does not install tools, spawn agents, edit product repositories, or claim that checks ran.

## Operating contract

Every request must declare a goal, scope, exclusions, constraints, acceptance criteria mapped to gate IDs, risk, platform, authorized actions, repository commit, and context policy. Callers may add competencies and gates, but cannot remove policy-derived requirements or supply their own execution evidence. Invalid or incomplete contracts fail closed.

The kernel then:

1. resolves the applicable domain pack and its quality gates;
2. derives an immutable `documentation-only`, `behavior-code`, or `high-risk-release` validation lane from trusted risk, action, gate, scope, and diff evidence;
3. inspects project manifests, lockfiles, scripts, host capabilities, and stack versions without accepting caller-supplied commands or treating a declaration range as an installed version;
4. evaluates every catalogued agent, skill, and tool against capability, freshness, availability, authority, safety, scenario preference, target affinity, and context cost;
5. selects the smallest complete resource set, then minimizes resources outside the immutable scenario preferences before context cost, with one lead, at most two specialists per wave, and an independent verifier for high- or critical-risk work;
6. builds a bounded context envelope with provenance, TTL, cache keys, and secret exclusions;
7. emits bounded Codex and Claude Code recommendations and an evidence ledger whose checks begin blocked, never pre-credited as passed;
8. creates only reviewable memory proposals for durable decisions, repository facts, learnings, or unresolved risks.

## Maturity boundary

`enterprise-core` is supported. Web/SaaS, iOS, Android, Windows desktop, macOS desktop, Expo/React Native, Electron, and Tauri packs are preview contracts until native pilots promote them independently. Preview does not mean fake execution: unavailable tools and missing evidence remain explicit.

This v0.3 candidate is not a controlled release, Level 4 certification, marketplace publication, automatic activation, or proof of production readiness. Existing source-review, runtime-bridge, pilot, security, operations, and release controls remain in force.

## Run it

Copy `templates/delivery-kernel.request.example.json`, replace its all-zero
`repository.expectedCommit` placeholder with the target repository's current
full 40-character Git SHA, then run:

```text
node scripts/ai-toolkit/run-delivery-kernel.mjs plan --input path/to/request.json
node scripts/ai-toolkit/run-delivery-kernel.mjs ingest-events --plan plan.json --events events.json
node scripts/ai-toolkit/run-delivery-kernel.mjs finalize --plan plan.json --events events.json --receipts receipts.json
```

Commands print JSON to standard output by default. A write requires an explicit
output path, the request's `scoped-local-write` authorization, and the matching
CLI authorization flag. Standalone serialized evidence remains untrusted and
cannot produce verified readiness; see `docs/HOST_EXECUTION_BRIDGE.md`.

Scenario `agents` and `skills`, plus support-tool entries that are canonical
resource IDs, become priority inputs owned by the trusted routing policy. They
are not a global allowlist and caller JSON cannot replace them. Routing output
records selected preferred resources, selected fallbacks, and unselected
preferences so policy drift remains reviewable.

`scoped-local-write` also creates a hard routing constraint: the selected team
must contain an eligible workspace-write agent with the `implementation`
competency. A skill or tool may advise implementation but cannot own the write.
An implementation writer is eligible only when the scenario prefers it or its
registry-derived platform/framework affinity matches explicit task intent. If
no such writer exists, routing returns no selected team and an explicit blocker.

Validate executable kernel behavior with:

```text
node scripts/ai-toolkit/run-delivery-kernel-evals.mjs
node scripts/ai-toolkit/run-enterprise-delivery-benchmark.mjs --summary
```

## Interpretation rules

- `selected` is a recommendation; it is not `invoked`.
- Agent definitions and compiled fallbacks are not actual spawn proof.
- `passed` requires observed passing evidence from the current run.
- `skipped`, `unavailable`, `simulated`, `partial`, and `planned` never satisfy a required gate.
- Upstream changes remain quarantined until license, security, compatibility, approval, and rollback evidence are recorded.
- Memory proposals require user review and must never contain secrets or raw transcripts.
- Each v0.3 assignment is single-attempt. A retry or replan requires a new plan digest and fresh context; agents do not own recursive or open-ended execution loops.
- Observed tool calls must bind once to an eligible selected project script, its inspected manifest/script digest, and the exact authorized action; spawn/delegation and ambiguous tool identities are rejected.
- Independent verifier receipts must record disconfirming checks and the evidence that would reverse their conclusion. Until the host bridge exists, serialized receipts remain untrusted and readiness stays blocked.
- The only accountable lead remains the fixed read-only Architect. Low-risk read-only work therefore retains that lead overhead, while low-risk write work with no preferred or target-matched writer blocks instead of fabricating a writable root principal. Removing that overhead requires the separately trusted host bridge/root-principal design, not another repository agent.
