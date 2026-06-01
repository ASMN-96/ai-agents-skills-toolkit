# Runtime Activation Model

## Purpose

This document separates the main toolkit repository's embedded distribution/governance package from Codex runtime activation.

This pivot intentionally creates local runtime copies for a small approved surface while keeping `.ai-toolkit/` non-runtime storage. It does not install tools, configure MCP servers, change global Codex config, change CI workflows, import raw upstream content, or modify product repositories.

## Verified Codex Runtime Surfaces

- Repo skills: `.agents/skills/<skill>/SKILL.md`.
- User skills: `$HOME/.agents/skills`.
- Project custom agents: `.codex/agents/*.toml`.
- Personal custom agents: `~/.codex/agents/*.toml`.

## Embedded Distribution Storage Is Not Runtime Activation

In this main toolkit repository, `.ai-toolkit/` is an embedded distribution and governance package. It is not a target-project install state, and it is not an active Codex runtime path by itself.

Runtime reporting must follow `docs/NO_FAKE_VALIDATION_POLICY.md`. Files under `.ai-toolkit/`, registries, source records, manifests, or packaged copies are storage and metadata evidence only; they must not be described as active runtime visibility, installed tools, executed validation, or approval unless an actual runtime or command check proves it.

## Active Runtime Boundary For This Pivot

Active repo skills are limited to fourteen reviewed runtime entries: five canonical final skills, four intermediate public aliases, and five old compatibility aliases.

- `.agents/skills/governance/SKILL.md`
- `.agents/skills/ai-project-governance/SKILL.md`
- `.agents/skills/riss-governance/SKILL.md`
- `.agents/skills/uiux/SKILL.md`
- `.agents/skills/premium-uiux-review/SKILL.md`
- `.agents/skills/vd-premium-uiux/SKILL.md`
- `.agents/skills/code-quality/SKILL.md`
- `.agents/skills/webapp-code-quality/SKILL.md`
- `.agents/skills/riss-code-quality/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- `.agents/skills/app-security-review/SKILL.md`
- `.agents/skills/riss-security-review/SKILL.md`
- `.agents/skills/pr-release-gate/SKILL.md`
- `.agents/skills/riss-release-gate/SKILL.md`

Active project custom agents remain limited to five approved TOML files:

- `.codex/agents/reviewer-agent.toml`
- `.codex/agents/frontend-agent.toml`
- `.codex/agents/security-agent.toml`
- `.codex/agents/qa-test-agent.toml`
- `.codex/agents/release-manager-agent.toml`

Product, Architect, UIUX, and Skill Scout remain top-level agent specs and compiled fallback material in this pass. Adding their `.codex/agents` runtime TOML files is a separate owner decision because it expands execution surfaces.

Skill, profile, and routing registry references to agents describe selected or recommended agent lenses unless current runtime evidence proves a spawned agent actually ran. Completion reports must distinguish selected or recommended agent, active runtime `.codex/agents` TOML, compiled fallback, inline lens, and actually spawned agent.

## Source-Of-Truth And Drift Rules

- Canonical skills live under `skills/`.
- Runtime skill copies under `.agents/skills/` must be byte-identical to their canonical `skills/` source.
- Distribution skill copies under `.ai-toolkit/skills/` must be byte-identical to their canonical `skills/` source.
- Registry files under `.ai-toolkit/registries/` are package mirrors and must match their top-level `registries/` source.
- Manifest hashes in `.ai-toolkit/manifest.json` are authoritative drift evidence for distribution copies.
- Validator WARN output is part of runtime-boundary evidence and must be surfaced even when the aggregate status is PASS.

The embedded builder intentionally preserves reviewed registry files instead of regenerating them from stale defaults. Validators confirm required active skills, registry references, mirrors, and evals remain present. Builder preservation does not authorize runtime activation, external tool activation, CI changes, MCP setup, global config changes, or product-repository sync.

## External Tool Boundary

Tool registry and source records are metadata only. They do not approve install, activation, CI wiring, MCP setup, credentials, global config, hooks, or PR write permissions.

Live source freshness is checked from the root script: `node scripts/check-source-freshness.mjs --fail-on-change`. The embedded package script at `scripts/ai-toolkit/check-source-freshness.mjs` is mock-only distribution scaffolding and must not be reported as live source freshness evidence.
