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

## Active Runtime Boundary

Active repo skills are limited to five reviewed canonical runtime entries.

- `.agents/skills/governance/SKILL.md`
- `.agents/skills/uiux/SKILL.md`
- `.agents/skills/code-quality/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- `.agents/skills/pr-release-gate/SKILL.md`

Active project custom agents are limited to twelve approved repo-local TOML files:

- `.codex/agents/product-agent.toml`
- `.codex/agents/architect-agent.toml`
- `.codex/agents/reviewer-agent.toml`
- `.codex/agents/uiux-agent.toml`
- `.codex/agents/frontend-agent.toml`
- `.codex/agents/backend-contract-agent.toml`
- `.codex/agents/database-rls-agent.toml`
- `.codex/agents/security-agent.toml`
- `.codex/agents/qa-test-agent.toml`
- `.codex/agents/release-manager-agent.toml`
- `.codex/agents/skill-scout-agent.toml`
- `.codex/agents/sre-performance-agent.toml`

The seven specialist agents added in this activation pass are read-only advisory agents. They expand repo-local runtime visibility for product framing, architecture framing, UI/UX criteria, backend/API contract review, database/RLS review, source-safety scouting, and SRE/performance review, but they do not authorize package changes, CI changes, MCP configuration, global Codex config changes, product-repository sync, secret access, production/data/destructive changes, external source import, scanner execution, or fake validation claims.

Backend Contract, Database RLS, and SRE Performance were upgraded from stubs to bounded read-only advisory agents before activation. Their hardening is anchored in OpenAPI/OAI contract description, OWASP API Security Top 10 risk categories, Supabase/Postgres RLS documentation, public/private leak gates, Google SRE golden signals, OpenTelemetry signals, and existing toolkit governance, security-review, code-quality, performance, release, and no-fake-validation methods. They still cannot approve production database changes, weaken RLS, perform security signoff alone, change deployment/CI/infrastructure, access secrets, or claim scanner/browser/runtime evidence without actual output.

Skill, profile, and routing registry references to agents describe selected or recommended agent lenses unless current runtime evidence proves a spawned agent actually ran. Completion reports must distinguish selected or recommended agent, active runtime `.codex/agents` TOML, compiled fallback, inline lens, and actually spawned agent.

## Global/User Codex Skill Audit Boundary

This repo-local activation pass did not modify global or user Codex files. The expected repo-local canonical skill names remain `governance`, `uiux`, `code-quality`, `security-review`, and `pr-release-gate`; global installation of these names is not required by this PR.

Read-only global/user inventory is outside the active repo runtime boundary. This PR does not rely on or mutate user-global skill or agent files. Any global cleanup requires a separate backup, classification report, owner approval, and explicit write authorization before any user-global file is changed, archived, or deleted.

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
