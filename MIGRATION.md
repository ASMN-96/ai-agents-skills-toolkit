# Migration Notes

This repository is not a Node package. There is intentionally no root `package.json`; use direct `node scripts/...` commands from the repository root.

## v0.2.2 To v0.2.3

- Treat `v0.2.3` as the current controlled release evidence. `v0.2.2` is historical.
- Replace passive `REVIEWED_HELD` source posture with final reviewed outcomes such as `SYNCED_ADOPTED`, `SYNCED_REFERENCE`, or `SYNCED_PLUGIN_DELEGATED`.
- Keep tool posture metadata as recommendation/evidence only. `active-if-detected` means project-owned tooling can be recommended when detected; it does not install or run tools.
- Report native-visible TOML files, compiled fallbacks, registry recommendation, inline fallback use, and actual spawned agents separately.
- Do not treat `.ai-toolkit/` mirrors, compiled agents, source records, registries, mock reports, or dry runs as runtime activation or release proof.

## Consumer Guidance

Product repositories should consume toolkit artifacts only through an approved project sync workflow and pinned toolkit version. Do not overwrite project `AGENTS.md`, product code, package files, CI, MCP config, global Codex config, secrets, or credentials from this toolkit without explicit project-level approval.

## Validation Before Claims

Before making readiness, release, source-freshness, runtime, or public-safety claims, rerun the relevant validator and report observed output, WARN output, skipped checks, and unavailable checks.
