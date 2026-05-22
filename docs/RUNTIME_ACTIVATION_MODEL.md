# Runtime Activation Model

## Purpose

This document separates toolkit storage and governance from Codex runtime activation.

This PR documents the model only. It does not activate skills, plugins, tools, custom agents, global configuration, or project sync behavior.

## Governance Storage Is Not Runtime Activation

`.ai-toolkit/` is the version-pinned governance, audit, and project-sync storage layer for target projects. It can store selected compiled agents, profiles, toolkit-owned skill files, sync metadata, and the toolkit version a project chose to consume.

Presence under `.ai-toolkit/` does not mean Codex runtime activation. Files stored there are project artifacts until a separate approved workflow copies, registers, or activates them through a Codex-supported runtime surface.

## Skill Runtime Surfaces

Codex runtime skill activation uses supported skill locations and plugin-provided skills, such as:

- project skill locations such as `.agents/skills`,
- user skill locations such as `$HOME/.agents/skills`,
- admin or system skill locations managed outside this repository,
- installed plugins that expose skills.

This toolkit must not treat `sources/`, `methods/`, `registries/`, `compiled-agents/`, or `.ai-toolkit/` as active runtime skill directories.

## Custom Agent Runtime Surfaces

Codex runtime custom agents use supported custom-agent locations, such as:

- project custom agents under `.codex/agents`,
- user custom agents under `~/.codex/agents`.

Compiled agents in this repository are optional project artifacts and fallback source material. They are not mandatory always-on runtime layers.

## Boundary For This Phase

This source-refresh and slimming phase must not:

- modify `~/.codex/agents`,
- modify `.codex/agents`,
- modify `.agents/skills`,
- modify global Codex config,
- install or activate skills, plugins, or tools,
- sync files into product repositories.

Runtime activation changes require a separate explicit approval with the exact target path, artifact list, validation plan, and rollback path.
