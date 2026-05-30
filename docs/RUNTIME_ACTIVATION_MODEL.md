# Runtime Activation Model

## Purpose

This document separates the main toolkit repository's embedded distribution/governance package from Codex runtime activation.

This pivot intentionally creates local runtime copies for a small approved surface while keeping `.ai-toolkit/` non-runtime storage. It does not install tools, configure MCP servers, change global Codex config, change CI workflows, import raw upstream content, or modify product repositories.

## Verified Codex Runtime Surfaces

The runtime-path model was checked against official OpenAI Codex docs during this implementation:

- Repo skills: `.agents/skills/<skill>/SKILL.md`. OpenAI's Codex skills docs state that repository skills are scanned from `.agents/skills` from the current working directory up to the repository root and that each skill directory contains `SKILL.md` with `name` and `description`. See [Agent Skills](https://developers.openai.com/codex/skills).
- User skills: `$HOME/.agents/skills`. The same OpenAI skills docs list the user skill location as `$HOME/.agents/skills`.
- Project custom agents: `.codex/agents/*.toml`. OpenAI's Codex subagents docs state that project-scoped custom agents live under `.codex/agents/` and require `name`, `description`, and `developer_instructions`. See [Subagents](https://developers.openai.com/codex/subagents).
- Personal custom agents: `~/.codex/agents/*.toml`. The same subagents docs list `~/.codex/agents/` for personal custom agents.

## Embedded Distribution Storage Is Not Runtime Activation

In this main toolkit repository, `.ai-toolkit/` is an embedded distribution and governance package. It is not a target-project install state, and it is not an active Codex runtime path by itself.

`.ai-toolkit/` may contain:

- source-of-truth map,
- distribution manifest,
- copied active skills for package review,
- copied custom-agent TOML for package review,
- copied registries,
- tool-pack route metadata,
- source records and watchlist metadata,
- checklists, templates, and eval scaffolding.

Presence under `.ai-toolkit/` never means:

- skill activation,
- custom-agent activation,
- external tool install,
- CI wiring,
- MCP setup,
- global Codex config changes,
- approval to run scans,
- raw upstream source import,
- product repository sync.

Runtime reporting must follow `docs/NO_FAKE_VALIDATION_POLICY.md`. Files under `.ai-toolkit/`, registries, source records, manifests, or packaged copies are storage and metadata evidence only; they must not be described as active runtime visibility, installed tools, executed validation, or approval unless an actual runtime or command check proves it.

## Active Runtime Boundary For This Pivot

Active repo skills are limited to:

- `.agents/skills/riss-governance/SKILL.md`
- `.agents/skills/vd-premium-uiux/SKILL.md`
- `.agents/skills/riss-code-quality/SKILL.md`
- `.agents/skills/riss-security-review/SKILL.md`
- `.agents/skills/riss-release-gate/SKILL.md`

Active project custom agents are limited to:

- `.codex/agents/reviewer-agent.toml`
- `.codex/agents/frontend-agent.toml`
- `.codex/agents/security-agent.toml`
- `.codex/agents/qa-test-agent.toml`
- `.codex/agents/release-manager-agent.toml`

The other top-level agent specs and compiled agents remain canonical or fallback source material. They are not all activated in this pass.

## Source-Of-Truth And Drift Rules

Top-level folders remain canonical and must not be deleted, relocated, or flattened in this implementation pass.

- Canonical skills live under `skills/`.
- Runtime skill copies under `.agents/skills/` must be byte-identical to their canonical `skills/` source.
- Distribution skill copies under `.ai-toolkit/skills/` must be byte-identical to their canonical `skills/` source.
- Registry files under `.ai-toolkit/registries/` are package mirrors and must match their top-level `registries/` source.
- Manifest hashes in `.ai-toolkit/manifest.json` are authoritative drift evidence for distribution copies.
- Validator WARN output is part of the runtime-boundary evidence. A PASS with WARN means the blocking checks passed, but the warning condition still exists and must be reported until fixed or explicitly accepted.

`scripts/sync-runtime.mjs` is the repo-local sync helper for the active skill surface. It is dry-run by default; `--confirm-write` is required before it copies canonical active skills into `.agents/skills/` and `.ai-toolkit/skills/` or updates `.ai-toolkit/manifest.json` hashes. The script refuses unknown skills and internal helper skills because helper activation requires a separate reviewed PR.

Any later cleanup, migration, folder flattening, or top-level relocation requires a separate PR after this pivot is proven.

## External Tool Boundary

Tool registry and source records are metadata only. They do not approve install, activation, CI wiring, MCP setup, credentials, global config, hooks, or PR write permissions.

Approval-required tools such as deep secret scanners, DAST, supply-chain scanners, and runner hardening remain unexecuted unless a later task explicitly approves a scoped target and validation plan.
