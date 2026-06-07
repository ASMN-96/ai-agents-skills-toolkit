# Compiled Agents

Compiled agents are generated intentionally from approved agent specs, reviewed methods, profiles, prompts, and project constraints.

Product repositories should sync compiled agents from this directory, not raw upstream source files or unreviewed external skills.

Compiled output should include toolkit version metadata so each project can pin and audit what it received.

## Phase 4 Compiled Agents

This directory now contains the first normalized compiled agent set:

- `skill-scout-agent.compiled.md`
- `product-agent.compiled.md`
- `architect-agent.compiled.md`
- `frontend-agent.compiled.md`
- `backend-contract-agent.compiled.md`
- `database-rls-agent.compiled.md`
- `uiux-agent.compiled.md`
- `qa-test-agent.compiled.md`
- `security-agent.compiled.md`
- `sre-performance-agent.compiled.md`
- `reviewer-agent.compiled.md`
- `release-manager-agent.compiled.md`

Each compiled agent follows the Phase 4 section contract, including role, activation phrases, embedded method summaries, support tool triggers, allowed scope, forbidden actions, workflow, output format, verification, stop conditions, and source provenance.

Each compiled agent starts with a metadata block containing:

- `toolkit_name`
- `toolkit_version`
- `toolkit_pin`
- `compiled_status`
- `compiled_at`
- `source_commit`
- `source_agent`
- `compiler`
- `registry_input`
- `source_profile_refs`
- `source_method_refs`
- `compile_contract_version`

This metadata is required at the top of every `*.compiled.md` file for downstream pinning and audit.

Compiled agents are fallback documentation artifacts until a project intentionally syncs a pinned toolkit version or a user explicitly uses them inline. Their presence does not prove native custom-agent visibility, agent spawning, delegated review, executed validation, tool execution, source freshness, or runtime activation. They do not activate skills, install external packs, overwrite project `AGENTS.md`, or change Codex global config.

Superpowers is referenced only as an external Codex execution-discipline plugin. Context7, Playwright, and Figma are support triggers only when available, configured, and relevant.

## Phase 10 Registry Status

Compiled agents remain the canonical fallback source for the 12 core agents. The registry now reports compiled fallback presence separately from `.codex/agents` TOML presence, registry recommendation, and actual spawn proof. Registry entries and compiled files do not prove native custom-agent runtime visibility and do not activate compiled agents.
