# Toolkit Architecture

AI Agent Skills Toolkit separates source intake, method extraction, agent definition, compilation, and project sync.

## Layers

- `sources/` stores reviewed references and source evaluation records.
- `methods/` stores approved reusable methods extracted from trusted sources. Method files are normalized and paraphrased; they are not raw upstream skills.
- `agents/` stores internal agent specifications.
- `profiles/` stores reusable operating-mode bundles that define included agents, support tools, allowed actions, forbidden actions, output format, and verification gates.
- `skills/` stores reviewed toolkit-owned skills and skill metadata.
- `compiled-agents/` stores intentional compiled outputs for project repositories.
- `registries/` stores machine-readable indexes for existing agents, skills, profiles, support tools, and plain-language routing scenarios.
- `evals/` stores routing, skill trigger, stop-condition, token-efficiency, and runtime visibility evaluation scaffolds.
- Global Codex custom agents can be generated from compiled agents under `~/.codex/agents/` after explicit approval.
- `install/` stores dry-run-first, version-pinned project sync workflows for selected compiled agents and profiles.

## Boundaries

Raw external skills and repositories do not become active automatically. Project repositories consume compiled agents, not upstream source files. Every project sync pins a toolkit version.

Phase 3 method extraction adds source records and normalized method documents only. It does not install skills, activate skills, clone external repositories, run third-party scripts, change global configuration, or create compiled agents.

Phase 4 agent compilation adds normalized compiled agent documents and reusable profiles only. Compiled agents summarize approved method rules into practical role-specific operating instructions. They do not duplicate full upstream method files, activate skills, create project sync scripts, overwrite project `AGENTS.md`, or modify product repositories.

Phase 5 project sync adds installer, updater, and validator scripts that manage selected files under a target project's `.ai-toolkit/` directory. These scripts are dry-run by default, require `-ConfirmWrite` for writes, preserve project-local context, and do not install external skills or activate compiled agents globally.

Phase 6 project-managed skill sync copies selected toolkit-owned single-file skills into target projects under `.ai-toolkit/skills/<skill-name>/SKILL.md`. It does not activate skills globally, modify Codex global config, or support bundled multi-file skill resources.

Phase 8 global custom-agent registration adds a Codex-native convenience layer above compiled agents. Native custom agents are preferred when available, but compiled agents remain the canonical fallback source. Global agent registration is not considered fully runtime-active until TOML validation and a Codex restart/new-session smoke test confirm visibility.

Phase 10A/10B adds a governance spine and registry contract. Registries are metadata only: they do not install, activate, approve, or execute anything. Phase 10A/10B registers existing assets first and preserves external-source scouting for later batches through `docs/EXTERNAL_SOURCE_BACKLOG.md`.

## Compilation Inputs

Compiled agents are assembled from:

- `agents/*.md` modular source agent specs.
- `methods/internal/*` governance and safety methods.
- `methods/karpathy/*`, `methods/osmani/*`, `methods/matt/*`, and `methods/uiux/*` normalized method libraries.
- Toolkit governance in `AGENTS.md` and `SECURITY.md`.
- Reusable profiles under `profiles/`.

Compiled agents must include source provenance so projects can audit which toolkit files informed the output.

## Profiles

Profiles group compiled agents by operating mode such as audit, implementation, frontend, backend, UI/UX, security, SRE, or release. Profiles define included agents, support tools, allowed actions, forbidden actions, output format, and verification gates.

Profiles are reusable selection guidance for routing and version-pinned sync selection. Phase 5 added dry-run-first sync workflows that can copy selected profiles into target projects with approval.

## Project Sync

Target projects receive selected compiled agents, profiles, and toolkit-owned skills under `.ai-toolkit/`. The toolkit writes `.ai-toolkit/.ai-toolkit-version` and `.ai-toolkit/.ai-toolkit.config.json` so each project can audit the toolkit version, commit, selected agents, selected profiles, and selected skills.

The sync workflow must never overwrite project-owned `AGENTS.md` or `docs/ai` context files. The current v1 workflow reports unmanaged/stale files and does not delete them.

## Support Tools

GSD and Superpowers are external core governance tools, not vendored toolkit dependencies.

- GSD handles phase/state/roadmap/release-gate tracking for serious multi-step work, audits, backend work, migrations, security/SRE audits, and release programs.
- Superpowers handles execution discipline for systematic debugging, TDD, code review, and verification-before-completion.
- `riss-governance` routes work across installed agents, profiles, and support tools.
- Context7, Playwright, Browser Use, GitHub, Supabase, Cloudflare, Vercel, and Figma are support tools used only when needed and available.

Agents and profiles remain role-specific workers. The toolkit must not activate every plugin, tool, agent, or profile by default.

## Global Codex Agents

Toolkit-managed global custom agents are generated as TOML files under `~/.codex/agents/`. They contain concise role instructions derived from compiled agents and source provenance back to `compiled-agents/*.compiled.md`.

If a native custom agent cannot be spawned, governance must report the failure. High-risk tasks require user approval before falling back to a built-in `worker` or `explorer` loaded with the matching compiled-agent instructions.

## Global Governance Entrypoint

Phase 9 adds a global `riss-governance` skill and `riss-governance-agent` router for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work.

The global skill is the user-facing one-command entrypoint. The router agent coordinates native custom agents when runtime-visible. If the router is not visible in the current Codex session, status is "Global riss-governance installed; restart/new session verification required."

This entrypoint is intentionally domain-scoped and must not become a generic workflow for unrelated projects unless the user explicitly requests it.

## Governance Spine

The Phase 10 governance spine keeps `riss-governance` as the normal user-facing entrypoint. It translates plain-language requests into inferred intent, risk level, selected profile, selected agents, selected skills, support tools, validation gates, stop conditions, and token mode.

Planned helper skills are documented as future contracts only:

- `riss-agent-governance` for agent routing and native/fallback status.
- `riss-skill-governance` for skill routing and missing-capability discovery.

These helpers are not implemented in Phase 10A/10B and must not become broad user-facing skills without separate approval.
