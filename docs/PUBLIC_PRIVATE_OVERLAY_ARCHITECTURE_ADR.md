# Public/Private Overlay Architecture ADR

Status: proposed, documentation-only

Date: 2026-05-30

## Context

The toolkit currently keeps canonical source assets in top-level folders such as `agents/`, `compiled-agents/`, `methods/`, `profiles/`, `registries/`, `skills/`, `sources/`, `evals/`, `scripts/`, `install/`, and `docs/`. That layout is still the active source of truth.

The repository also contains project-specific naming and historical references that are useful for local governance but not clean enough for enterprise or public release. Public/private release boundaries now exist as policy, leak scanning, and naming-compatibility docs, but not as a fully separated folder architecture.

## Decision

Define a future public/private overlay architecture without moving folders in this sprint.

The future architecture is:

```text
core/
  agents/
  compiled-agents/
  methods/
  profiles/
  registries/
  skills/
  sources/
  templates/
  checklists/
  evals/
  docs/
runtimes/
  codex/
  claude/
  cursor/
  cline/
  openhands/
private-overlays/
  <organization-or-project>/
distribution/
  ai-toolkit/
```

This ADR is an intent record, not an implementation approval. The current top-level folders remain canonical until a later migration PR proves compatibility and public/private safety.

## Boundary Model

`core/` would hold public-safe, runtime-neutral governance assets:

- reviewed methods,
- generic skills and compatibility aliases,
- agent source specs,
- compiled agent outputs after deterministic compile-contract adoption,
- profiles,
- registries,
- source records,
- templates,
- checklists,
- evals,
- governance docs,
- release/readiness policies.

`runtimes/codex/` would hold Codex-specific adapter assets:

- repo runtime skill mirrors,
- custom-agent TOML generation inputs or outputs when approved,
- Codex-specific activation documentation,
- Codex validation scripts or fixtures.

`runtimes/claude/`, `runtimes/cursor/`, `runtimes/cline/`, and `runtimes/openhands/` would start as documentation/export layers only. They must not weaken Codex compatibility, duplicate installed plugin behavior, activate tools, install dependencies, or claim runtime support before separate proof.

`private-overlays/` would hold non-public material:

- client, company, product, or project names,
- local filesystem paths,
- private URLs and repository names,
- private deployment, business, stack, and operating assumptions,
- domain-specific checklists or generated package text that is not safe for public release.

`distribution/ai-toolkit/` would be the future public package build output. Today, `.ai-toolkit/` remains the embedded distribution/governance package inside this repository and is not a runtime activation surface.

## Compatibility Rules

- No top-level folder moves are approved by this ADR.
- Existing paths remain valid until a reviewed compatibility layer exists.
- Public generic names are introduced through aliases, wrappers, registries, and docs before any runtime rename.
- Codex remains first-class; other runtime folders are adapters only until independently verified.
- Project sync continues to consume reviewed, version-pinned assets and must not overwrite project-owned context.
- Public packages must be generated from an allowlist, not from broad directory copying.

## Migration Gates

A future migration PR must pass all of these gates before moving folders:

- public/private leak scanner has no unresolved release-blocking findings for public package paths,
- generic naming compatibility map is implemented and verified,
- registry references and eval fixtures resolve from the new paths,
- sourceRef traceability is preserved,
- compiled-agent provenance and compile-contract rules are preserved,
- project sync dry-run and validation still work,
- embedded package manifests and source-of-truth maps are updated deterministically,
- Codex runtime mirrors still validate by byte identity or explicit manifest hash,
- rollback path is documented.

## Forbidden By This ADR

- Moving, deleting, or renaming top-level folders.
- Creating runtime adapters that claim support without validation.
- Moving project/private terms into public release paths.
- Treating `.ai-toolkit/` as a runtime activation surface.
- Adding CI, package, lockfile, MCP, global Codex config, or product-repository changes.
- Broadly copying raw upstream sources into `core/`.

## Consequences

This ADR gives future cleanup work a concrete target without creating migration churn now. It also makes public release blockers explicit: naming, leak scanning, package allowlisting, runtime compatibility, and provenance must be solved before folder moves.

Until those gates are met, the current repository shape remains the source of truth.
