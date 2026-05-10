# Changelog

All notable changes to AI Agent Skills Toolkit will be documented here.

## Unreleased

- Initialized toolkit structure.
- Added first internal agent specification: Skill Scout Agent.
- Added governance, security, roadmap, checklist, template, and architecture documents.
- Added Phase 2 source evaluation records and summary.
- Added Phase 3 normalized method extraction drafts for internal, Karpathy-inspired, Osmani-inspired, Matt Pocock-inspired, and UI/UX method libraries.
- Added Phase 4 compiled agent drafts for 12 internal agents.
- Added Phase 4 reusable profiles for audit, implementation, frontend, backend, UI/UX, security, SRE, and release workflows.
- Updated compiled agent, profile, architecture, roadmap, and update policy documentation for Phase 4 compilation boundaries.
- Added Phase 5 dry-run-first project install, update, and validation workflow scripts.
- Added Phase 5 project sync workflow and install safety documentation.
- Added a `.ai-toolkit` config example for selected agent/profile installs.
- Added `riss-governance` as a RISS-specific governance skill for serious project work.
- Added Phase 6 project-managed skill sync for selected toolkit-owned skills under `.ai-toolkit/skills/`.
- Added Phase 7 governance-only toolchain policy: GSD is an external core governance tool alongside Superpowers, not a vendored toolkit dependency.
- Added Phase 8 global Codex custom-agent governance: native custom agents are preferred when runtime-visible, with compiled-agent fallback and restart verification requirements.
- Added Phase 9 global `riss-governance` entrypoint policy for scoped RISS/AI Toolkit governance, router-agent coordination, and restart/new-session visibility verification.
- Added Phase 10A/10B governance spine docs, registry contracts, external-source backlog, registries, routing/eval scaffolding, missing-skill discovery policy, token-efficiency policy, and runtime verification docs.
- Reconciled toolkit docs to reflect existing evaluated source records, profiles, compiled agents, and external support-tool boundaries.
- Updated Phase 10C batch 1 source records for Anthropic skills, Vercel find-skills, and skills.sh as read-only scouting records only.
- Added Phase 10C batch 2 source records for Supabase agent-skills, Trail of Bits skills, and Playwright as read-only scouting records only.
- Added Phase 10C batch 3 source records for shadcn/ui, Addy Osmani web-quality-skills, and VoltAgent awesome-design-md as read-only scouting records only.
- Added Phase 10D source records for orchestration, harness-hardening, routing, external execution discipline, and GitLab agent docs as read-only scouting records only.
- Added Phase 10E narrow method extraction for skill anatomy, source discovery, source safety scoring, Supabase/Postgres/RLS gates, differential security review, and webapp runtime testing without adding skills or agents.
- Added Phase 10F passive method registry and routing/eval method references without turning methods into skills, tools, agents, or active runtime capabilities.
- Added Phase 10G current-session runtime verification reporting without installing, activating, or modifying global runtime configuration.
- Added Phase 10H real-project readiness gates for fresh-session verification, controlled pilot sync, and normal project-use criteria without changing runtime activation.
- Added Phase 10I fresh-session smoke-test reporting and follow-up Level 2 certification for one controlled real-project pilot. The first fresh run exposed a WindowsApps PowerShell startup failure under the elevated Windows sandbox; the passing run used a temporary per-command unelevated sandbox override without changing global Codex config.
- Added Phase 10L governance UX and skill-selection hardening for plain-language routing, strict response budgets, internal helper skills, missing-skill preflight, sensitive-data alternatives, design-source approval, CodeRabbit triage, typo guard, dashboard performance scoping, and eval coverage without changing runtime activation.
- Added Phase 10N explicit opt-in governance mode, permission matrix, agent-spawn boundaries, support-tool invocation boundaries, and eval coverage without broad tool activation, external installs, product repo changes, or global config changes.
- Added Phase 10O read-only source freshness monitoring with a source watchlist, dependency-free report script, and sample freshness report. This phase does not import external sources, install external skills, activate plugins, extract methods, update source records automatically, modify product repos, or change global config. Phase 10 is ready to close only after the Phase 10O PR is reviewed and merged.
