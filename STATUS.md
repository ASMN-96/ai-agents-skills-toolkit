# Toolkit Status

<!-- v0.3-release-evidence:start -->
> Release evidence: candidate `0.3.0` is **BLOCKED**; controlled release remains `0.2.5`. Static benchmark: **PASS** (100.0% competency, 100.0% gates, 100.0% golden routing, 69.4% median input-token reduction). Sources: 80 actionable globally, 8 release-blocking for enterprise-core, 72 release-nonblocking, 0 approved receipts. Runtime: 5 skills, 15 native agents, 15 compiled fallbacks; host bridge absent.
<!-- v0.3-release-evidence:end -->

Current controlled release: `v0.2.5`

Controlled release evidence is an internal evidence-state marker until a matching git tag or GitHub Release is created; it is not, by itself, publication proof.

Current working state: the v0.3.0 enterprise delivery kernel candidate is implemented on a feature branch and remains under review. It is not a release, tag, or enterprise-rollout claim.

## Runtime Boundary

- Canonical active repo skills: 5.
- Repo-local project agent files: 15 `.codex/agents/*.toml` files.
- Compiled fallbacks: 15 `compiled-agents/*.compiled.md` files.
- Preview agents: `backend-implementation-agent`, `desktop-platform-agent`, `mobile-platform-agent`.
- Agents without compiled fallbacks: none.
- Actual agent spawn proof: absent unless observed in the current task.

TOML file presence, compiled fallback presence, registry recommendation, and actual spawn proof must be reported separately.

## Release Boundary

The v0.3.0 candidate adds executable planning and evidence contracts, but release remains blocked by actionable source freshness/review state, the absent runtime-owned execution bridge, unmeasured human/native pilots, and final full-gate evidence. It is not package publication, marketplace submission, enterprise certification, automatic install approval, CI wiring, MCP/global config, product-repository mutation, or broad cross-runtime active support.

## Validation Entry Points

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `node scripts/ai-toolkit/run-delivery-kernel-evals.mjs`
- `node scripts/ai-toolkit/run-enterprise-delivery-benchmark.mjs --summary`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/check-source-freshness.mjs --fail-on-change`
- `node scripts/scan-public-private-leaks.mjs --check`

Only report validation that actually ran and include WARN output.

## Accepted Limitations

- `scripts/ai-toolkit/embedded-data.mjs` does not implement incremental/no-op build detection. Full deterministic rebuild and validator output are preferred until a hash-based no-op mode can be added without hiding changed generated output.
- `.ai-toolkit/` and `compiled-agents/` remain tracked canonical/distribution artifacts. `.gitignore` should only exclude local scratch, dependency, report, and credential artifacts, not these directories wholesale.
