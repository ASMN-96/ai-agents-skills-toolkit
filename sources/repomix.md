# Repomix Source Record

- Source name: Repomix
- Repository: yamadashy/repomix
- Source URL: https://github.com/yamadashy/repomix
- Homepage: https://repomix.com
- Last reviewed commit: bb4ac4763faeb7fc3d31438f072a6946b5b290b9
- Last reviewed date: 2026-06-19
- Review level: optional-tool posture reference
- Classification: active-if-detected or owner-approved-install candidate for scoped context packing/token counts
- License status: MIT signal in public repository metadata; not legal approval to copy raw upstream content
- Maintenance signal: public repository default branch resolved on 2026-06-11
- neverAutoImport: true

## Toolkit Value

Repomix is useful as an optional practical tool for scoped context packs and token counts when a project already owns it or the owner explicitly approves installation/execution. It is not the primary design model and is not a default dependency.

## Adopted Guidance

- Detect project-owned Repomix configuration or dependency before recommending use.
- Use only scoped packs tied to selected files, directories, or task neighborhoods.
- Use token counts as measurement evidence when actual output is observed.

## Boundaries

- Do not run Repomix from registry or source-record presence.
- Do not install Repomix, edit package files, wire CI, configure MCP, or change global config without explicit owner approval.
- Package changes and MCP setup require explicit owner approval.
- Do not create automatic whole-repo dumps.
- Do not include secrets, `.env` values, private overlays, generated build output, package caches, or user-local paths.
- Do not claim Repomix output unless the approved command actually ran and produced observed output.

## Used By

- `methods/orchestration/compact-agent-context-pack.md`
- `registries/tools.registry.json`
- `.ai-toolkit/context/project-map.json` Repomix posture field

## Freshness Review 2026-06-19

Skill Scout read-only source-freshness follow-up reviewed upstream default-branch movement from `fc69dcc31357d5db934f67ceaff4150f67e4735c` to `bb4ac4763faeb7fc3d31438f072a6946b5b290b9` using `git ls-remote` and GitHub compare metadata only. The compare was 65 commits ahead and touched dependency updates, GitHub workflows, Claude automation workflows, Docker, CodeQL, browser CI, and packaging-related surfaces. Repomix remains optional scoped context packing/token-count support only; no CI, automation, Docker, package, MCP, or execution behavior is adopted.

Outcome: `SYNCED_REFERENCE`. This refresh updates source tracking only and does not approve raw source copying, install, activation, script execution, MCP setup, global configuration changes, CI wiring, product-repository mutation, or runtime behavior changes.
