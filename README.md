# AI Agent Skills Toolkit

AI Agent Skills Toolkit is a central workspace for production-grade software governance: reusable agents, reviewed methods, source-safety records, skill evaluations, profiles, prompts, and install or update workflows that can later be synced intentionally into software projects.

This repository is not a product repo and not a second Codex runtime. It is a governance, provenance, source-safety, routing, quality-control, and release-discipline layer for serious software projects across SaaS, internal tools, infrastructure platforms, mobile apps, AI products, enterprise software, backend systems, frontend products, and data platforms.

## Core Model

- Agents are the main workers. They combine role, operating rules, evaluation criteria, and approved methods.
- Methods are reviewed reusable practices from sources such as Osmani, Matt Pocock, Karpathy, Anthropic/UIUX, and internal experience.
- Skills are treated as supply-chain artifacts. Raw external skills are never activated automatically.
- Profiles tune compiled agents for project context, risk level, stack, and operating mode.
- Compiled agents are the only agent artifacts intended to be synced into product projects.
- Registries index existing agents, skills, passive methods, profiles, tools, and routing scenarios. Registry presence does not imply activation.

Superpowers is already available in Codex and is treated as an external execution-discipline plugin. This toolkit does not duplicate it. Context7, Playwright, and Figma are support tools used only when needed.

Codex-native execution remains primary. This toolkit sets the governance bar, source-of-truth checks, source-safety gates, project-specific standards, and release discipline while selecting the minimum useful agents, skills, profiles, and support tools for the task.

## Why Skill Scout Comes First

External skills, GitHub repos, docs, marketplaces, and community sources can contain useful methods, but they can also contain unsafe instructions, stale patterns, dangerous scripts, unclear licenses, or prompt-injection content.

The Skill Scout Agent audits sources before anything is imported into this toolkit. It is read-only by default and never installs, activates, clones, or modifies product repositories.

## Versioned Updates

Updates are versioned and intentional because project repositories must be able to pin a known toolkit version. No project should receive broad, automatic imports from upstream sources. Every sync should be deliberate, reviewed, and reproducible.

## Workflow

The high-level workflow is:

`scout -> evaluate -> approve -> extract -> compile -> sync into project`

1. Scout candidate sources without installing or activating them.
2. Evaluate trust, safety, license, maintenance, and usefulness.
3. Approve the source or reject it.
4. Extract reviewed methods into modular toolkit assets.
5. Compile agents from approved methods, rules, profiles, and prompts.
6. Sync compiled agents into a project that pins the toolkit version.

## Current Status

Phases 1-9 established the toolkit foundation, source records, normalized methods, 12 compiled agents, profiles, dry-run project sync, project-managed skill sync, external GSD/Superpowers governance, Codex custom-agent governance, and the `riss-governance` entrypoint.

Phase 10A/10B adds the governance spine contract, registries, token-efficiency policy, missing-skill discovery policy, runtime verification docs, external-source backlog, and eval scaffolding. Phase 10C/10D refreshes external source records only. Phase 10E adds narrow normalized methods. Phase 10F indexes reviewed methods as passive metadata and routing references. These phases do not install tools, activate skills, clone repositories, copy raw external skills, modify global Codex config, or touch product repositories.

Phase 10 source-refresh slimming adds the production-grade software governance model, runtime activation boundary, overlap classification, and live source freshness refresh while preserving Codex/plugin execution authority.

Post-PR #39 hardening starts with validation honesty and public/private release safety. `docs/NO_FAKE_VALIDATION_POLICY.md` defines reporting truth rules, and `scripts/scan-public-private-leaks.mjs` generates a report-only public/private leak scan before any public release or naming migration.
