# Source Provenance Audit

Date: 2026-06-07

This audit records source-license and adoption boundaries for sources that can be misunderstood as runtime approval. It is static governance evidence, not source import approval, install approval, activation approval, or release proof.

## Trail of Bits

- Source record: `sources/trailofbits-skills.md`
- Watchlist outcome: `SYNCED_ADOPTED`
- License boundary: CC-BY-SA source record; no raw upstream text may be copied into toolkit methods.
- Current method usage: cleanroom differential-security review discipline in `methods/security/differential-security-review.md`.
- Required boundary: any future security-method update must preserve attribution in source records and avoid close paraphrase or copied upstream phrasing.

## Karpathy-Inspired Skills

- Source record: `sources/karpathy-inspired-skills.md`
- License boundary: license unclear; historical reference only.
- Current method usage: `methods/karpathy/*.md` are toolkit-authored cleanroom methods and use `sourceRef: ["toolkit-authored"]`.
- Required boundary: no upstream wording, examples, prompt structure, scripts, or runtime behavior may be copied or activated from this source.

## Impeccable

- Source record: `sources/impeccable.md`
- Watchlist outcome: `SYNCED_ADOPTED`
- Adoption boundary: adopted only as normalized UI-quality source intelligence.
- Explicitly rejected: CLI execution, live-browser workflow activation, detector/package behavior, skill-bundle behavior, Dependabot/CI workflow adoption, lockfile/package adoption, raw documentation import, and script execution.
- Documentation note: `SYNCED_ADOPTED` is not install approval; docs that say "no Impeccable install unless approved" remain consistent with this boundary.

## RuFlo

- Source record: `sources/ruflo.md`
- Watchlist outcome: `SYNCED_ADOPTED`
- Adoption boundary: static task-state and handoff discipline only, currently represented by `methods/orchestration/static-task-state-handoff-ledger.md`.
- Explicitly rejected: daemon, worker, hook, MCP, memory bridge, plugin, package, script, background runtime, file watcher, global config, and runtime persistence.

## Everything Claude Code

- Source record: `sources/everything-claude-code.md`
- Watchlist outcome: `SYNCED_REFERENCE`
- Adoption boundary: source-safety awareness for cross-harness risk scoring only.
- Machine-checkable policy: `scripts/validate-toolkit.mjs` now verifies rejected-pattern boundaries in the watchlist and source record.
- Explicitly rejected: install scripts, hooks, commands, plugins, agents, skills, rules, memory/learning behavior, `.mcp.json`, MCP inventory import, session-adapter import, control-plane import, global config behavior, broad cross-harness runtime support claims, and script execution.

## GitLab Docs

- Source records: `sources/gitlab-agent-skills.md`, `sources/gitlab-agentic-tool-development.md`
- Watchlist mode: `manual-reviewed-doc`
- Boundary: official docs are manually tracked as reviewed documentation sources without live GitHub freshness proof.
- Explicitly rejected: raw docs copying, GitLab-specific structure adoption, install, activation, MCP/server creation, product integration, and runtime support claims.
