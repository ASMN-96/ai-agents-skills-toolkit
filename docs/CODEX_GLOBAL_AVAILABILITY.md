# Codex Global Availability Contract

## Scope

- Scope is verification of current global availability expectations for this toolkit repository.
- Repository-local runtime proof remains independent of machine-specific global cleanup.
- v0.2.1 PR2 performed backup-first cleanup of toolkit-owned global runtime files only; it did not edit global Codex config, MCP settings, plugin cache, product repositories, package files, or lockfiles.
- Source of global state evidence: `<codex-home>/agents/ai-toolkit-agents-manifest.json`, `~/.codex/agents/*.toml`, and the five canonical toolkit skill files in `~/.codex/skills/<skill>/SKILL.md`.

## What is Repo-Discoverable

- Agents: all artifacts in `agents/`.
- Skills: all artifacts in `skills/` and helper files in `SKILL.md`.
- Profiles: all artifacts in `profiles/`.
- Methods: all artifacts in `methods/`.
- Registries: all artifacts in `registries/`.
- Eval scaffolds and governance docs under `docs/`, `evals/`, and `sources/`.

## What is Globally Available

- Canonical global skills present in `~/.codex/skills`:
  - `governance`
  - `uiux`
  - `code-quality`
  - `security-review`
  - `pr-release-gate`
- Global TOML agents present in `~/.codex/agents`:
  - `architect-agent`
  - `backend-contract-agent`
  - `database-rls-agent`
  - `frontend-agent`
  - `product-agent`
  - `qa-test-agent`
  - `release-manager-agent`
  - `reviewer-agent`
  - `security-agent`
  - `skill-scout-agent`
  - `sre-performance-agent`
  - `uiux-agent`
- Generated global manifest:
  - `<codex-home>/agents/ai-toolkit-agents-manifest.json`

## What is Compiled-Fallback Only

- All agents listed in `compiled-agents/*.compiled.md` are the canonical local fallback when native custom agents are not available in-session.

## What is Intentionally Not Global

- Non-canonical repo skills are not globally mirrored by default.
- Retired helper aliases are not globally mirrored by default.
- External global Codex settings and plugin install/state are unchanged in this scope.

## How to Safely Globalize Later

- Run an approved backup-first global availability workflow.
- Refresh only toolkit-owned canonical runtime files unless owner approval explicitly expands scope.
- Regenerate `~/.codex/agents/ai-toolkit-agents-manifest.json` only as toolkit-owned runtime metadata.
- Revalidate manifest + runtime session visibility before claiming durable global visibility.

## Files to Keep in Toolkit Management

- `docs/CODEX_GLOBAL_AVAILABILITY.md`
- `docs/V0_2_1_RUNTIME_ADOPTION_PROOF.md`
- Registry entries in `registries/*`
- Manifest source of truth in `~/.codex/agents/ai-toolkit-agents-manifest.json`

## What Not to Overwrite

- Do not overwrite:
  - Global skill/toolchain plugin configuration
  - Product repositories
  - Unapproved external upstream skill artifacts
  - Third-party runtime or security-critical files
  - Uncertain global skills, agents, plugins, caches, auth files, databases, or MCP settings
