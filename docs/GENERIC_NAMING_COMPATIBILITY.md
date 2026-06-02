# Generic Naming Compatibility

## Current Runtime

The public runtime uses one canonical naming system:

- `governance`
- `uiux`
- `code-quality`
- `security-review`
- `pr-release-gate`

The active project-agent surface remains the twelve approved repo-local agents documented in `docs/RUNTIME_ACTIVATION_MODEL.md`.

## Compatibility Boundary

The old alias and helper names are no longer active runtime names, sync selections, public package skills, registry entries, or eval targets. Runtime validators reject non-canonical skill selections.

For the one allowed migration reference that maps old names to canonical replacements, see `docs/MIGRATION_TO_CANONICAL_SKILLS.md`.

## Non-Goals

- No product repository sync.
- No global Codex file changes.
- No package, lockfile, CI, MCP, deployment, or dependency changes.
- No public-release or Level 4 readiness claim.
