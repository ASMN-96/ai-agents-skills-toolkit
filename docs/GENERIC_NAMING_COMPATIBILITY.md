# Generic Naming Compatibility Plan

## Purpose

This plan defines how project-specific toolkit names migrate toward public-safe generic names without breaking current Codex runtime discovery, project sync manifests, registry references, or existing prompts.

This is a compatibility design only. It does not rename active runtime skills, delete old names, regenerate compiled agents, change package or lockfiles, alter CI, or activate helper skills.

## Future Public Naming Map

| Current name | Future public name | Status | Compatibility behavior |
| --- | --- | --- | --- |
| `riss-governance` | `ai-project-governance` | compatibility alias required | Keep current runtime skill active until alias/wrapper support is implemented and verified. |
| `riss-code-quality` | `webapp-code-quality` | compatibility alias required | Keep current runtime skill active; future generic skill should delegate to the same canonical policy. |
| `riss-security-review` | `app-security-review` | compatibility alias required | Keep current runtime skill active; future generic skill must preserve security stop conditions. |
| `riss-release-gate` | `pr-release-gate` | compatibility alias required | Keep current runtime skill active; future generic skill must preserve PR/check/CodeRabbit/reviewdog boundaries. |
| `vd-premium-uiux` | `premium-uiux-review` | compatibility alias required | Keep current runtime skill active; future generic skill must preserve UI/UX runtime-evidence honesty. |

## Compatibility Strategy

- Old names remain the active runtime names until a later PR adds tested aliases, wrappers, or deprecation shims.
- New names are reserved as future public names in registry metadata and docs only.
- Validators must accept both old and future names during migration once alias files exist.
- Runtime skill copies under `.agents/skills/` remain byte-identical to canonical `skills/` files.
- Embedded package copies under `.ai-toolkit/skills/` remain package mirrors and do not imply runtime activation.
- Public docs should prefer future generic names once aliases exist; internal history may keep old names as historical references.
- Project-specific examples, stack assumptions, client details, local paths, and private repo references move to a future private overlay or are excluded from public release.

## Non-Goals For This PR

- No active runtime rename.
- No deletion of old skill directories.
- No compiled-agent regeneration or mechanical version restamp.
- No broad top-level folder relocation.
- No product repository sync.
- No package, lockfile, CI, MCP, global config, or external tool changes.

## Validator And Eval Expectations

- Registry entries may include `futurePublicName`, `deprecatedAliases`, and `namingMigrationStatus`.
- Presence of a future public name is metadata only until a real skill path exists.
- Evals should confirm old names still route during the migration window.
- Evals should confirm future names are treated as reserved aliases, not active runtime skills, until alias files are implemented.
- Completion reports must distinguish current active runtime names from future public names.

## Public Release Gate

Public release remains blocked while old project-specific names exist in public/core paths unless they are explicitly:

- compatibility aliases with a deprecation plan,
- historical/internal references excluded from public artifacts,
- private-overlay-only assets,
- or false positives documented by the leak scanner.
