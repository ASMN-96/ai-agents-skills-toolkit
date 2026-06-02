# Roadmap

## Phase 1: Foundation and Skill Scout Agent

Create the toolkit structure, governance rules, safety boundaries, checklists, templates, documentation, and the first internal agent: Skill Scout Agent.

## Phase 2: Source Evaluation

Use Skill Scout Agent to evaluate candidate external skills, GitHub repositories, official docs, marketplaces, and community sources without installing, cloning, activating, or running them.

Status: Completed as read-only evaluation. Summary lives in `PHASE_2_SOURCE_EVALUATION_SUMMARY.md`; source records live under `sources/`.

## Phase 3: Method Extraction

Extract approved concepts into modular methods after review. Keep extracted methods separate from raw external source files.

Status: Completed and merged. Outputs are normalized/paraphrased method files only, with source inspiration and license status documented in each method.

## Phase 4: Agent Compilation

Compile internal agents from approved methods, profiles, prompts, and governance rules. Record toolkit version metadata in compiled outputs.

Status: Completed and merged. This phase added product-ready compiled agent documents and reusable profiles. It did not activate compiled agents globally, create project sync scripts, install external skills, or touch product repositories.

## Phase 5: Project Sync / Install Workflow

Create intentional, version-pinned sync and install workflows for project repositories. Project repos consume compiled agents, not raw upstream files.

Status: Completed. This phase added dry-run-first install, update, and validation scripts plus project sync safety documentation. No product repo install was performed in this phase.

## Phase 6: Project Governance Skills

Add project-specific governance skills that help installed toolkit agents operate safely inside target repositories.

Status: Completed for v1. Phase 6 added project-managed skill sync so selected toolkit-owned skills can be copied into target repositories under `.ai-toolkit/skills/` without global activation.

## Phase 7: Core Toolchain Governance

Make GSD a core external governance layer alongside Superpowers.

Status: Governance-only. GSD is treated as an external prerequisite/support tool for phase/state/roadmap/release-gate tracking. Superpowers remains the external execution-discipline plugin for debugging, TDD, code review, and verification-before-completion. GSD files are not vendored into the toolkit.

## Phase 8: Codex Custom Agents And Routing

Register toolkit agents as global Codex custom agents while preserving compiled agents as the safe fallback path.

Status: Global custom-agent TOML registration and governance routing. Native custom agents are preferred when available; until runtime smoke testing passes after Codex restart/new session, status is "registered, restart verification required."

## Phase 9: Governance Entrypoint

Define a governance entrypoint for toolkit-governed product, backend, security, release, and repo governance work.

Status: Governance skill and agent registration. Do not mark runtime visibility fully active until restart/new-session verification confirms the active runtime surface.

## Phase 10A: Governance Spine and Registry Contract

Build the governance spine, registry contract, token-efficiency policy, missing-skill discovery policy, runtime verification docs, and external-source backlog.

Status: Completed and merged via Phase 10A/10B PR. This phase registered existing assets only and did not install, activate, clone, copy, or extract new external sources.

## Phase 10B: Toolkit-State Reconciliation and Evals

Reconcile stale documentation, add source-record quality rules, and add eval scaffolding for routing, skill triggers, stop conditions, token efficiency, and runtime visibility.

Status: Completed and merged via Phase 10A/10B PR. External source scouting and method extraction were deferred to Phase 10C+.

## Phase 10C: External Source Scouting

Refresh source records for the safest high-leverage external sources before any extraction.

Status: Completed through batch 3. No method extraction, install, activation, cloning, raw skill copying, or new skill directories were included.

Batch 1 updated existing source records for Anthropic skills, Vercel find-skills, and skills.sh. Batch 2 added source records for Supabase agent-skills, Trail of Bits skills, and Playwright. Batch 3 added source records for shadcn/ui, Addy Osmani web-quality-skills, and VoltAgent awesome-design-md.

## Phase 10D: Orchestration and Harness Source Scouting

Refresh source records for orchestration, harness-hardening, routing, external execution discipline, and GitLab agent docs before any extraction.

Status: Completed and merged via Phase 10D PR.

Phase 10D adds source records for agency-agents, Superpowers, everything-claude-code, ruflo, vercel-labs/agent-skills, GitLab Agentic Tool Development docs, and GitLab Agent Skills docs. No method extraction, install, activation, cloning, raw skill copying, hooks, daemons, MCP servers, global config changes, product repo changes, or new skill directories are included.

## Phase 10E: Narrow Method Extraction

Extract a small set of normalized, source-cited methods from already-reviewed Phase 10C/10D source records.

Status: Completed and merged via Phase 10E PR.

Phase 10E updates existing internal discovery, skill-anatomy, source-safety, and UI runtime testing methods, and adds narrow backend/database and differential security review gates. It does not add skills, agents, compiled agents, registries, hooks, daemons, MCP servers, global config, product repo changes, installs, activation, cloning, or raw upstream copying.

## Phase 10F: Passive Method Index and Routing Alignment

Index reviewed methods as passive registry metadata and add optional method references to routing/eval contracts.

Status: Completed and merged via Phase 10F PR.

Phase 10F adds `registries/methods.registry.json` and passive `methodReferences` for routing scenarios. It does not create skills, agents, compiled agents, profiles, active runtime behavior, install/sync flows, hooks, daemons, MCP servers, global config changes, product repo changes, cloning, activation, or raw upstream copying.

## Phase 10G: Runtime Verification Report

Record current-session runtime visibility, fallback status, and remaining fresh-session activation limits without modifying runtime state.

Status: Completed and merged via Phase 10G PR.

Phase 10G adds a dated runtime verification report and updates runtime documentation. It does not install, activate, clone, spawn every agent, change global Codex config, modify product repos, query live Supabase projects, or claim durable fresh-session activation.

## Phase 10H: Real Project Readiness Gate

Define when the toolkit can safely move from toolkit-only governance work into controlled real-project pilots.

Status: Documentation-only readiness gate.

Phase 10H adds real-project readiness levels, fresh-session smoke-test criteria, controlled pilot entry requirements, stop conditions, and rollout boundaries. It does not install, activate, clone, sync into product repos, change global Codex config, add skills, add agents, update registries, or claim durable activation.

## Phase 10I: Fresh-Session Runtime Smoke Test

Attempt to certify Level 2 readiness for one controlled real-project pilot using an independent fresh Codex CLI session.

Status: Completed and Level 2 certified for one controlled pilot.

Phase 10I records that the initial fresh CLI session could see the governance skill and native agent roles, but could not run local shell checks because Windows sandbox process startup failed with `CreateProcessAsUserW failed: 5`. A follow-up fresh CLI session used a temporary per-command `windows.sandbox="unelevated"` override, without changing global config, and verified source truth, JSON validity, native role visibility, compiled fallback presence, support-tool visibility, and no silent fallback. No product repos, global Codex config, skills, agents, registries, source records, install scripts, external installs, activation, hooks, daemons, or MCP servers were changed.

## Phase 10J: First Pilot Repo Dry-Run Sync Plan

Plan the first controlled real-project pilot from the Level 2-certified toolkit state.

Status: Planned.

Phase 10J should select one low-risk pilot repository, define the exact dry-run sync scope, preserve product-owned context, pin the toolkit version, and require PR review before any project write. It should not perform broad rollout or automatic sync.

## Phase 10L: Governance UX and Skill-Selection Hardening

Make the toolkit safer and easier for a non-technical user before live-project adoption.

Status: Completed and merged.

Phase 10L adds plain-language routing, strict response-budget rules, internal helper skills for agent and skill governance, missing-skill preflight, sensitive-data examples, design-source approval, CodeRabbit triage, typo/token-efficiency, and dashboard performance scoping evals. It does not add core agents, regenerate compiled agents, install external skills, activate plugins, clone repositories, change global Codex config, modify product repos, run migrations, or upgrade real-project readiness.

## Phase 10N: Explicit Opt-In Governance

Clarify that toolkit governance can be explicitly opted into for serious project threads without weakening safety.

Status: Completed and merged.

Phase 10N adds explicit opt-in governance mode, a permission matrix, agent-spawn boundaries, support-tool invocation boundaries, and eval coverage. It does not authorize writes by itself, broadly activate tools, install external sources, change global Codex config, modify product repos, or upgrade real-project readiness.

## Phase 10O: Read-Only Source Freshness Monitor

Add a minimal source freshness monitor for external GitHub repositories already tracked through the backlog or local source records.

Status: Implemented in this PR; Phase 10O is complete only after this PR is reviewed and merged.

Phase 10O adds a read-only/report-only watchlist, a dependency-free source freshness script, and a sample generated report. It detects upstream change signals only and does not approve source import, install external skills, activate plugins, clone repositories, copy raw upstream files, extract methods, update source records automatically, change global Codex config, modify product repos, add schedulers, add daemons, add CI, or upgrade real-project readiness.

## Phase 10 Closure

Phase 10 is ready to close after this Phase 10O PR is reviewed and merged. The closed Phase 10 scope will include governance spine, source scouting, method indexing, runtime/readiness gates, Level 2 certification, governance UX hardening, explicit opt-in governance, and read-only source freshness monitoring.

Future work after Phase 10 should be planned in a separate phase and must keep the same review, safety, and approval boundaries.

## Post-PR #39 Hardening

Status: in progress on a local hardening branch.

The hardening sprint improves validation honesty, public/private release safety, enterprise tool metadata, sourceRef traceability, sync automation, operator guidance, eval coverage, registry generation design, compile-contract governance, cross-platform project sync, and future public/private architecture boundaries.

`docs/PUBLIC_PRIVATE_OVERLAY_ARCHITECTURE_ADR.md` defines the future `core/`, `runtimes/`, `private-overlays/`, and distribution architecture. It is documentation-only and does not authorize folder relocation, runtime expansion, CI changes, package changes, or public release readiness claims.

`docs/SOURCE_FRESHNESS_ISSUE_WORKFLOW.md` defines dry-run source freshness issue drafts with dedupe keys, labels, affected methods, and explicit no-import/no-activation language. Live issue creation remains unapproved future work.

`docs/STALE_UNVERIFIED_DATA_CLASSIFICATION.md` classifies stale, unverified, historical, private-overlay-only, and remove-later signals as report-only cleanup input. It does not authorize deletion, renaming, relocation, or public release readiness.

`docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` formalizes maturity Levels 0-5. The sprint leaves the toolkit at Level 3; Level 4 enterprise rollout and Level 5 public release require separate owner decisions and evidence.
