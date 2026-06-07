# Toolkit Status

Current controlled release evidence: `v0.2.3`

Current working state: `Unreleased` audit remediation is in progress on top of v0.2.3 evidence.

## Runtime Boundary

- Canonical active repo skills: 5.
- Repo-local project agent files: 12 `.codex/agents/*.toml` files.
- Compiled fallbacks: 12 `compiled-agents/*.compiled.md` files.
- Actual agent spawn proof: absent unless observed in the current task.

TOML file presence, compiled fallback presence, registry recommendation, and actual spawn proof must be reported separately.

## Release Boundary

`v0.2.3` is a controlled toolkit release evidence state. It is not package publication, marketplace submission, enterprise certification, automatic install approval, CI wiring, MCP/global config, product-repository mutation, or broad cross-runtime active support.

## Validation Entry Points

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/check-source-freshness.mjs --fail-on-change`
- `node scripts/scan-public-private-leaks.mjs --check`

Only report validation that actually ran and include WARN output.

## Accepted Limitations

- `scripts/ai-toolkit/embedded-data.mjs` does not implement incremental/no-op build detection. Full deterministic rebuild and validator output are preferred until a hash-based no-op mode can be added without hiding changed generated output.
- `.ai-toolkit/` and `compiled-agents/` remain tracked canonical/distribution artifacts. `.gitignore` should only exclude local scratch, dependency, report, and credential artifacts, not these directories wholesale.
