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

Status: Completed for v1. Phase 6 added `riss-governance` and project-managed skill sync so selected toolkit-owned skills can be copied into target repositories under `.ai-toolkit/skills/` without global activation.

## Phase 7: Core Toolchain Governance

Make GSD a core external governance layer alongside Superpowers.

Status: Governance-only. GSD is treated as an external prerequisite/support tool for phase/state/roadmap/release-gate tracking. Superpowers remains the external execution-discipline plugin for debugging, TDD, code review, and verification-before-completion. GSD files are not vendored into the toolkit.

## Phase 8: Codex Custom Agents And Routing

Register toolkit agents as global Codex custom agents while preserving compiled agents as the safe fallback path.

Status: Global custom-agent TOML registration and governance routing. Native custom agents are preferred when available; until runtime smoke testing passes after Codex restart/new session, status is "registered, restart verification required."

## Phase 9: Global riss-governance Entrypoint

Install `riss-governance` globally as the one-command governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work.

Status: Global skill and router-agent registration. Do not mark runtime visibility fully active until restart/new-session verification confirms both the skill and `riss-governance-agent` router are visible.

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

Status: Started on `codex/phase-10e-method-extraction`.

Phase 10E updates existing internal discovery, skill-anatomy, source-safety, and UI runtime testing methods, and adds narrow backend/database and differential security review gates. It does not add skills, agents, compiled agents, registries, hooks, daemons, MCP servers, global config, product repo changes, installs, activation, cloning, or raw upstream copying.
