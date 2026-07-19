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
- `scripts/compile-agents.mjs`
- `scripts/ai-toolkit/compiler-provenance.mjs`
- the compiler's repository-local production import closure listed by `COMPILER_DIGEST_PATHS`

It must not read raw upstream repositories, external skill files, package caches, global Codex config, product repositories, secrets, `.env` files, logs, build artifacts, browser traces, or network responses.

## Ordering

Inputs must be ordered deterministically:

- agents by registry order,
- profiles by registry order,
- method references by registry order,
- source references by sorted stable path,
- generated sections by fixed headings,
- arrays and maps in stable lexical order unless registry order is the contract.

Output must be reproducible from the same canonical inputs, compiler closure, and canonical-source revision. Commits that touch only generated output or unrelated repository files must not change compiled output.

## Required Metadata

Every compiled agent must include frontmatter with:

- `toolkit_name`
- `toolkit_version`
- `toolkit_pin`
- `compiled_status`
- `compiled_at` or `compiled_at: deterministic-not-recorded`
- `source_commit`
- `input_digest`
- `input_digest_scope`
- `compiler_digest`
- `source_agent`
- `compiler`
- `registry_input`
- `source_profile_refs`
- `source_method_refs`
- `compile_contract_version`

Unknown review metadata must be explicit as `unknown-review-required`; it must not be guessed. `source_commit` is derived internally from the latest commit that touches the fixed canonical agent-input pathspecs or any `COMPILER_DIGEST_PATHS` entry. It is lowercase 40-hex provenance, not caller input and not the current repository `HEAD`. The compiler fails closed when it cannot resolve that commit. `input_digest` and `compiler_digest` are the content-integrity gates. `compiled_at` may remain `deterministic-not-recorded` so unrelated commits do not create generated drift.

Canonical `agents/*.md` source files must not carry generated compile provenance such as `toolkit_pin`, `last_compiled_against`, `source_commit`, or content/compiler digests. Those values would be stale or self-referential as soon as the source changes. The agent registry owns lifecycle and fallback-path declarations; deterministic compiled output owns version, pin, revision, and digest metadata.

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

- target: at most 3,500 words,
- warning: above 4,500 words,
- failure: above 6,000 words,
- generated sections must be summarized rather than pasted when source files are long.

The compiler must report size by agent and fail or warn according to the configured threshold.

## Warning Policy

`--check` treats generated-content or provenance drift as a failure. A compiled fallback above the 3,500-word target remains visible as `above-target`; above 4,500 words is a WARN and above 6,000 words fails compilation. WARN output must remain visible in aggregate validation even when other checks pass.

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
