# Compiled-Agent Compile Contract

## Purpose

This contract defines how future `compile-agents.mjs` work must regenerate compiled agents deterministically and reviewably.

The deterministic compiler is `scripts/compile-agents.mjs`. It supports dry-run reporting and explicit write mode, and it does not activate runtime agents or read external sources.

## Deterministic Inputs

The compiler may read only reviewed, repo-owned inputs:

- `agents/*.md`
- `methods/**/*.md`
- `profiles/*.md`
- `registries/agents.registry.json`
- `registries/methods.registry.json`
- `registries/profiles.registry.json`
- approved checklists and templates
- explicit compile configuration

It must not read raw upstream repositories, external skill files, package caches, global Codex config, product repositories, secrets, `.env` files, logs, build artifacts, browser traces, or network responses.

## Ordering

Inputs must be ordered deterministically:

- agents by registry order,
- profiles by registry order,
- method references by registry order,
- source references by sorted stable path,
- generated sections by fixed headings,
- arrays and maps in stable lexical order unless registry order is the contract.

Output must be reproducible from the same commit and configuration.

## Required Metadata

Every compiled agent must include frontmatter with:

- `toolkit_name`
- `toolkit_version`
- `toolkit_pin`
- `compiled_status`
- `compiled_at` or `compiled_at: deterministic-not-recorded`
- `source_commit`
- `source_agent`
- `compiler`
- `registry_input`
- `source_profile_refs`
- `source_method_refs`
- `compile_contract_version`

Unknown values must be explicit as `unknown-review-required`; they must not be guessed. `source_commit` must be resolved from `git rev-parse HEAD` at compile time. `compiled_at` may remain `deterministic-not-recorded` so regenerated outputs stay stable when the same source commit and inputs are used.

## Provenance Requirements

Compiled outputs must list:

- source agent path,
- compiler path,
- registry input path,
- profile paths used,
- method IDs and method paths used,
- sourceRef IDs inherited from method frontmatter,
- registry files used,
- checklists or templates used.

The provenance section must distinguish source inspiration from authority. External source records never authorize raw copying.

## Forbidden Content

Compiled agents must not include:

- secrets, tokens, cookies, private URLs, private local paths, or environment values,
- raw upstream skill bodies,
- copied third-party documentation blocks,
- package install commands,
- CI, MCP, or global config mutation commands,
- product-repo specific names unless building a private overlay,
- claims that native custom agents, plugins, or browser checks are active.

## Size Budget

Each compiled agent should stay small enough for routine review and use:

- target: under 20,000 words,
- hard review warning: over 30,000 words,
- generated sections must be summarized rather than pasted when source files are long.

The compiler must report size by agent and fail or warn according to the configured threshold.

## Warning Policy

Compiled-agent version drift remains a WARN, not a failure, until:

1. this compile contract is implemented,
2. the compiler is dry-run validated,
3. generated diffs are reviewed,
4. provenance and size reports are attached,
5. rollback is documented.

Warnings must remain visible in aggregate validation. After implementation, generated-artifact drift is a reproducibility issue unless explicitly accepted by an owner.

## Review Requirements

A regeneration PR must include:

- dry-run report,
- generated diff summary,
- provenance report,
- size report,
- validator output with WARN summary,
- security review for forbidden content,
- public/private leak scan,
- rollback plan.

## Rollback

Compiled agents are generated artifacts. Rollback is a normal git revert of the regeneration commit. The compiler must not mutate canonical agents, methods, profiles, registries, skills, sources, global config, product repositories, package files, or CI.
