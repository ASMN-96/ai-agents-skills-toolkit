# AI Agent Skills Toolkit

AI Agent Skills Toolkit is a central workspace for managing reusable agents, reviewed methods, skill evaluations, profiles, prompts, and install or update workflows that can later be synced intentionally into software projects.

This repository is not a product repo. It is a governance and preparation layer for agent-system assets.

## Core Model

- Agents are the main workers. They combine role, operating rules, evaluation criteria, and approved methods.
- Methods are reviewed reusable practices from sources such as Osmani, Matt Pocock, Karpathy, Anthropic/UIUX, and internal experience.
- Skills are treated as supply-chain artifacts. Raw external skills are never activated automatically.
- Profiles tune compiled agents for project context, risk level, stack, and operating mode.
- Compiled agents are the only agent artifacts intended to be synced into product projects.

Superpowers is already available in Codex and is treated as an external execution-discipline plugin. This toolkit does not duplicate it. Context7, Playwright, and Figma are support tools used only when needed.

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

Phase 1 begins with the foundation structure and the first internal agent: Skill Scout Agent.
