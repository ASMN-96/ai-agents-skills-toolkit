# Toolkit Architecture

AI Agent Skills Toolkit separates production-grade governance, source intake, method extraction, agent definition, compilation, embedded distribution packaging, runtime-boundary documentation, and project sync.

The toolkit is a governance, provenance, source-safety, routing, quality-control, and release-discipline layer for serious software projects. It is not a second Codex runtime and must not duplicate Codex-native capabilities, installed plugins, official OpenAI/Codex docs, or external skill/plugin behavior.

## Main-Toolkit Embedded Distribution Pivot

This repository now carries an embedded distribution/governance package at `.ai-toolkit/`. In this main toolkit repo, `.ai-toolkit/` is not a target-project install state and is not a Codex runtime activation path. It is a packaged, reviewable view of selected toolkit assets with a source-of-truth map, manifest hashes, registries, source records, route metadata, checklists, templates, and eval scaffolding.

The pivot keeps the top-level folders as canonical source material. This implementation pass must not delete, relocate, or flatten `agents/`, `compiled-agents/`, `registries/`, `methods/`, `sources/`, `profiles/`, `evals/`, `scripts/`, or `skills/`. Any cleanup or migration of top-level folders is a later PR after the embedded package is validated.

Active runtime remains intentionally small:

- repo skills under `.agents/skills/`: `riss-governance`, `vd-premium-uiux`, `riss-code-quality`, `riss-security-review`, and `riss-release-gate`;
- project custom agents under `.codex/agents/`: reviewer, frontend, security, QA/test, and release manager.

All mirrors must be validated by byte identity or manifest hash. Registries and source records remain metadata only; they do not install, activate, approve, configure CI, configure MCP, change global Codex config, or import raw upstream content.

## Layers

- `sources/` stores reviewed references and source evaluation records.
- `methods/` stores approved reusable methods extracted from trusted sources. Method files are normalized and paraphrased; they are not raw upstream skills.
- `agents/` stores internal agent specifications.
- `profiles/` stores reusable operating-mode bundles as file-backed markdown specs.
- `skills/` stores reviewed toolkit-owned skills and skill metadata.
- `compiled-agents/` stores intentional compiled outputs for project repositories.
- `registries/` stores machine-readable indexes for existing agents, skills, passive methods, profiles, support tools, and plain-language routing scenarios.
- `evals/` stores routing, skill trigger, stop-condition, token-efficiency, and runtime visibility evaluation scaffolds.
- `.agents/skills/` stores the small active repo-skill runtime copy set for this toolkit repository.
- `.codex/agents/` stores the small active project custom-agent runtime copy set for this toolkit repository.
- `.ai-toolkit/` stores the embedded distribution/governance package and mirror manifest. It is non-runtime storage.
- `docs/PRODUCTION_GRADE_SOFTWARE_GOVERNANCE.md` defines the universal quality bar and first-pilot usage model.
- `docs/RUNTIME_ACTIVATION_MODEL.md` separates `.ai-toolkit/` governance storage from Codex runtime activation surfaces.
- `docs/OVERLAP_REDUCTION.md` classifies duplicated authority as keep-active, delegate-to-codex-plugin, passive-reference, or candidate-removal.
- Global Codex custom agents can be generated from compiled agents under `~/.codex/agents/` after explicit approval.
- `install/` stores dry-run-first, version-pinned project sync workflows for selected compiled agents and profiles.

## Boundaries

Raw external skills and repositories do not become active automatically. Project repositories consume compiled agents, not upstream source files. Every project sync pins a toolkit version.

Codex-native execution remains primary. Toolkit governance selects only the minimum useful agents, skills, profiles, and support tools for the work; it must not activate every plugin, tool, agent, or profile by default.

Phase 3 method extraction adds source records and normalized method documents only. It does not install skills, activate skills, clone external repositories, run third-party scripts, change global configuration, or create compiled agents.

Phase 4 agent compilation adds normalized compiled agent documents and reusable profiles only. Compiled agents summarize approved method rules into practical role-specific operating instructions. They do not duplicate full upstream method files, activate skills, create project sync scripts, overwrite project `AGENTS.md`, or modify product repositories.

Phase 5 project sync adds installer, updater, and validator scripts that manage selected files under a target project's `.ai-toolkit/` directory. These scripts are dry-run by default, require `-ConfirmWrite` for writes, preserve project-local context, and do not install external skills or activate compiled agents globally.

The main-toolkit `.ai-toolkit/` package is different from a target-project install. It is the distribution/governance package built inside this repo; target-project installs remain separately managed by the `install/` workflow.

Phase 6 project-managed skill sync copies selected toolkit-owned single-file skills into target projects under `.ai-toolkit/skills/<skill-name>/SKILL.md`. It does not activate skills globally, modify Codex global config, or support bundled multi-file skill resources.

Phase 8 global custom-agent registration adds a Codex-native convenience layer above compiled agents. Native custom agents are preferred when available, but compiled agents remain the canonical fallback source. Global agent registration is not considered fully runtime-active until TOML validation and a Codex restart/new-session smoke test confirm visibility.

Phase 10A/10B adds a governance spine and registry contract. Registries are metadata only: they do not install, activate, approve, or execute anything. Phase 10A/10B registers existing assets first and preserves external-source scouting for later batches through `docs/EXTERNAL_SOURCE_BACKLOG.md`.

Phase 10F adds a passive method registry and optional routing `methodReferences`. Method references explain which reviewed methods can inform a route; they are not skills, tools, agents, support-tool requirements, install approval, or runtime activation.

Phase 10O adds read-only/report-only source freshness monitoring for tracked GitHub sources. It detects upstream change signals and may generate a local Markdown report, but it does not approve source import, install or activate external skills, extract methods, update source records automatically, change global configuration, or modify product repositories. This behavior is governed by `docs/EXTERNAL_SOURCE_FRESHNESS_POLICY.md`.

Freshness and extraction are separated by timeline:
- `last checked` = monitored signal only (freshness script/report),
- `last reviewed` = human Skill Scout review,
- `last extracted` = signed toolkit method/skill update through PR.

## Compilation Inputs

Compiled agents are assembled from:

- `agents/*.md` modular source agent specs (file-backed markdown).
- `methods/internal/*` governance and safety methods.
- `methods/karpathy/*`, `methods/osmani/*`, `methods/matt/*`, and `methods/uiux/*` normalized method libraries.
- Toolkit governance in `AGENTS.md` and `SECURITY.md`.
- Reusable profiles under `profiles/`.
- Profile artifacts are file-backed markdown documents in the repo, not directories.

Compiled agents must include source provenance so projects can audit which toolkit files informed the output.

## Profiles

Profiles group compiled agents by operating mode such as audit, implementation, frontend, backend, UI/UX, security, SRE, or release. Profiles define included agents, support tools, allowed actions, forbidden actions, output format, and verification gates.

Profiles are reusable selection guidance for routing and version-pinned sync selection. Phase 5 added dry-run-first sync workflows that can copy selected profiles into target projects with approval.

## Project Sync

Target projects receive selected compiled agents, profiles, and toolkit-owned skills under `.ai-toolkit/`. The toolkit writes `.ai-toolkit/.ai-toolkit-version` and `.ai-toolkit/.ai-toolkit.config.json` so each project can audit the toolkit version, commit, selected agents, selected profiles, and selected skills.

The sync workflow must never overwrite project-owned `AGENTS.md` or `docs/ai` context files. The current v1 workflow reports unmanaged/stale files and does not delete them.

Real-project use is gated by `docs/REAL_PROJECT_READINESS.md`. The toolkit is pilot-ready only after fresh-session runtime verification passes, and normal project use requires at least one controlled feature-branch pilot with dry-run-first sync, version pinning, validation, and PR review.

## Support Tools

GSD and Superpowers are external core governance tools, not vendored toolkit dependencies.

- GSD handles phase/state/roadmap/release-gate tracking for serious multi-step work, audits, backend work, migrations, security/SRE audits, and release programs.
- Superpowers handles execution discipline for systematic debugging, TDD, code review, and verification-before-completion.
- `riss-governance` routes work across installed agents, profiles, and support tools for primary domains and explicitly opted-in serious project threads.
- Context7, Playwright, Browser Use, GitHub, Supabase, Cloudflare, Vercel, and Figma are support tools used only when needed and available.

Agents and profiles remain role-specific workers. The toolkit must not activate every plugin, tool, agent, or profile by default.

## Global Codex Agents

Toolkit-managed global custom agents are generated as TOML files under `~/.codex/agents/`. They contain concise role instructions derived from compiled agents and source provenance back to `compiled-agents/*.compiled.md`.

Global availability model:

- Repository-discoverable: any toolkit artifact present in this repo.
- Globally available: artifacts listed in `~/.codex/agents` TOML set when global registration is run and confirmed.
- Compiled-fallback available: built `compiled-agents/*.compiled.md` files used when native global visibility is unavailable.
- Intentionally not global: helper skills beyond minimal runtime entrypoints (`riss-agent-governance`, `riss-skill-governance`) and non-approved external source artifacts.

Governance always selects and reports the needed agents. Native sub-agents are spawned only when runtime rules allow and the user explicitly authorizes delegation, sub-agents, or parallel agent work. If spawning is not allowed, governance proceeds inline using the selected agent lenses and reports that no sub-agent ran. If an authorized native custom-agent spawn fails, governance must report the failure. High-risk tasks require user approval before falling back to a built-in `worker` or `explorer` loaded with the matching compiled-agent instructions.

## Global Governance Entrypoint

Phase 9 adds a global `riss-governance` skill and `riss-governance-agent` router for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work.

The global skill is the user-facing one-command entrypoint. The router agent coordinates native custom agents when runtime-visible. If the router is not visible in the current Codex session, status is "Global riss-governance installed; restart/new session verification required."

This entrypoint is primarily domain-scoped, but it may be used in any repository or project thread when the user explicitly invokes `Use riss-governance`. Explicit opt-in makes it the active governance layer for that thread or task only; it does not authorize writes, migrations, package changes, Supabase policy/auth/billing/deployment changes, global Codex config changes, external installs, or broad plugin/tool use.

## Governance Spine

The Phase 10 governance spine keeps `riss-governance` as the normal user-facing entrypoint for primary domains and explicit opt-in serious project threads. It translates plain-language requests into inferred intent, risk level, selected profile, selected agents, selected skills, support tools, validation gates, stop conditions, and token mode.

Method references are supporting metadata for this translation. They help explain why a route should use specific review discipline, but they do not bypass `riss-governance` or become executable capabilities.

Phase 2 separates UI/UX execution from governance routing:

- `riss-governance` remains the router/safety/source-of-truth layer.
- `vd-premium-uiux` executes UI/UX quality workflow for frontend premium polish, dashboard UX, responsive layout, and visual QA.
- Governance remains responsible for scope, risk, and stop conditions; UI/UX execution lives in the direct skill.

Internal helper skills support the governance entrypoint:

- `riss-agent-governance` for agent routing and native/fallback status.
- `riss-skill-governance` for skill routing and missing-capability discovery.

These helpers must not become broad user-facing skills. Direct user calls redirect back through `riss-governance`, and repo availability does not imply runtime activation or native visibility.
