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

Status: In progress on `phase5-project-sync-workflow`. This phase adds dry-run-first install, update, and validation scripts plus project sync safety documentation. No product repo install is performed in this phase.

## Phase 6: Project Governance Skills

Add project-specific governance skills that help installed toolkit agents operate safely inside target repositories.

Status: Started with `riss-governance`. Phase 6 adds project-managed skill sync so selected toolkit-owned skills can be copied into target repositories under `.ai-toolkit/skills/` without global activation.

## Phase 7: Core Toolchain Governance

Make GSD a core external governance layer alongside Superpowers.

Status: Governance-only. GSD is treated as an external prerequisite/support tool for phase/state/roadmap/release-gate tracking. Superpowers remains the external execution-discipline plugin for debugging, TDD, code review, and verification-before-completion. GSD files are not vendored into the toolkit.
