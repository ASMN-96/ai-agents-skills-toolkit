# Codex Global Availability Contract

## Scope

- Scope is read-only verification of current global availability expectations for this toolkit repository.
- Repository-only checks: no writes to global configuration or global runtime state are performed by this audit.
- Source of global state evidence: `C:\\Users\\Abdal\\.codex\\agents\\ai-toolkit-agents-manifest.json` and `~/.codex/agents/*.toml`.

## What is Repo-Discoverable

- Agents: all artifacts in `agents/`.
- Skills: all artifacts in `skills/` and helper files in `SKILL.md`.
- Profiles: all artifacts in `profiles/`.
- Methods: all artifacts in `methods/`.
- Registries: all artifacts in `registries/`.
- Eval scaffolds and governance docs under `docs/`, `evals/`, and `sources/`.

## What is Globally Available

- Global TOML agents present in `~/.codex/agents`:
  - `architect-agent`
  - `backend-contract-agent`
  - `database-rls-agent`
  - `frontend-agent`
  - `product-agent`
  - `qa-test-agent`
  - `release-manager-agent`
  - `reviewer-agent`
  - `riss-governance-agent`
  - `security-agent`
  - `skill-scout-agent`
  - `sre-performance-agent`
  - `uiux-agent`
- Generated global manifest:
  - `C:\\Users\\Abdal\\.codex\\agents\\ai-toolkit-agents-manifest.json`

## What is Compiled-Fallback Only

- All agents listed in `compiled-agents/*.compiled.md` are the canonical local fallback when native custom agents are not available in-session.

## What is Intentionally Not Global

- `vd-premium-uiux` skill is repo-global in this toolkit and is intentionally not mirrored as a global skill file by default.
- Core helper skills remain repo/process assets and not globally mirrored by default:
  - `riss-agent-governance`
  - `riss-skill-governance`
- External global Codex settings and plugin install/state are unchanged in this scope.

## How to Safely Globalize Later

- Update/refresh global registry generation tooling.
- Run an approved global availability workflow.
- Regenerate `~/.codex/agents/ai-toolkit-agents-manifest.json`.
- Revalidate manifest + runtime session visibility before claiming durable global visibility.

## Files to Keep in Toolkit Management

- `docs/CODEX_GLOBAL_AVAILABILITY.md`
- Registry entries in `registries/*`
- Manifest source of truth in `~/.codex/agents/ai-toolkit-agents-manifest.json`

## What Not to Overwrite

- Do not overwrite:
  - Global skill/toolchain plugin configuration
  - Product repositories
  - Unapproved external upstream skill artifacts
  - Third-party runtime or security-critical files
