# Generic Naming Compatibility Plan

## Purpose

This plan defines the final skill naming model. The toolkit now prefers short canonical names while preserving intermediate public aliases and old compatibility aliases so existing prompts, project sync manifests, and runtime discovery do not break.

## Final Naming Map

| Canonical final name | Intermediate alias | Old compatibility alias | Status |
| --- | --- | --- | --- |
| `governance` | `ai-project-governance` | `riss-governance` | canonical final active |
| `uiux` | `premium-uiux-review` | `vd-premium-uiux` | canonical final active |
| `code-quality` | `webapp-code-quality` | `riss-code-quality` | canonical final active |
| `security-review` | `app-security-review` | `riss-security-review` | canonical final active |
| `pr-release-gate` | none; already final | `riss-release-gate` | canonical final active |

## Compatibility Strategy

- Canonical final names are the preferred names for docs, routing, profiles, and evals.
- Intermediate aliases remain active runtime skills and point to their canonical final skill with `canonicalName`.
- Old compatibility aliases remain active runtime skills and point to their canonical final skill with `canonicalName`.
- Alias `SKILL.md` files are compatibility wrappers, not independent behavior forks. They must state the canonical final skill and use the canonical skill's behavior, boundaries, stop conditions, token/context governance, completion evidence, and no-fake-validation rules.
- Old names must not be deleted until a later migration explicitly proves no current project or prompt depends on them.
- Runtime skill copies under `.agents/skills/` remain byte-identical to canonical `skills/` sources.
- Embedded package copies under `.ai-toolkit/skills/` remain package mirrors and do not imply runtime activation.

## Compatibility Eval Filenames

The following eval filenames remain as compatibility artifacts during the alias migration:

- `evals/routing/riss-governance-routing-evals.json`
- `evals/skills/riss-skill-trigger-evals.json`
- `evals/skills/premium-uiux-review-evals.json`

These filenames do not make the old names canonical. Their internal expectations must prefer canonical final skill names, while explicitly preserving intermediate and old compatibility aliases until a later owner-approved cleanup renames the files safely.

For UI/UX evals, `uiux` is the canonical and current expected skill. `premium-uiux-review` is the intermediate compatibility alias. `vd-premium-uiux` is the old compatibility alias.

## Non-Goals For This PR

- No deletion of old skill directories.
- No broad top-level folder relocation.
- No product repository sync.
- No package, lockfile, CI, MCP, global config, or external tool changes.
- No new `.codex/agents` activation beyond the existing five approved project custom agents.

## Validator And Eval Expectations

- Registry entries must include `canonicalName`, `compatibilityAliases`, `futurePublicName`, and `namingMigrationStatus` where relevant.
- Evals confirm final names are active, intermediate aliases remain active, and old compatibility aliases remain active.
- Completion reports must distinguish canonical final names from aliases and must not present aliases as deleted.
- The active runtime boundary intentionally remains fourteen active skills until alias compatibility can be retired through a separate migration.
