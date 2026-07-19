# Generic Naming Compatibility

## Current Runtime

The public runtime uses one canonical naming system:

- `governance`
- `uiux`
- `code-quality`
- `security-review`
- `pr-release-gate`

The v0.3 candidate project-agent surface is the registry-declared set of approved repo-local definitions documented in `docs/RUNTIME_ACTIVATION_MODEL.md`. Compiled-fallback and preview native-only posture comes from the canonical agent registry and release-evidence record rather than a duplicated count here.

## Compatibility Boundary

The old alias and helper names are no longer active runtime names, sync selections, public package skills, registry entries, or eval targets. Runtime validators reject non-canonical skill selections.

For the one allowed migration reference that maps old names to canonical replacements, see `docs/MIGRATION_TO_CANONICAL_SKILLS.md`.

## Non-Goals

- No product repository sync.
- No global Codex file changes.
- No package, lockfile, CI, MCP, deployment, or dependency changes.
- No public-release or Level 4 readiness claim.
