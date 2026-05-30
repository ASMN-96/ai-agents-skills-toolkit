# Registry Generation Design

## Purpose

This design defines a future frontmatter-driven registry generation path without changing registry ownership today.

The current implementation is report-only. `scripts/report-registry-generation-readiness.mjs` inspects source files and registries, then reports which assets have enough frontmatter to become generator inputs later.

## Generation Boundary

Future generators may derive stable, low-risk fields from source frontmatter:

- registry ID or name,
- display name,
- description,
- source path,
- source references,
- extraction date when evidence exists,
- basic documentation status.

Future generators must not derive or approve:

- routing-matrix scenarios,
- selected agents or skills,
- external tool trust,
- license approval,
- security review status,
- enterprise allowed environments,
- activation status,
- CI, GitHub, MCP, global config, or product-repository permissions,
- public/private release classification.

Those fields remain hand-maintained until a later reviewed contract explicitly narrows the rule.

## Source Frontmatter

Skills already use `SKILL.md` frontmatter for `name` and `description`.

Methods now use method frontmatter for:

- `sourceRef`
- `lastExtracted`
- `status`

Agents and profiles do not yet have registry-generation frontmatter. They remain manual registry entries until a later PR adds a compatible frontmatter contract.

## Report-Only Workflow

Run:

```text
node scripts/report-registry-generation-readiness.mjs --output docs/REGISTRY_GENERATION_READINESS_REPORT.md
```

The report:

- does not write registries,
- does not activate skills or agents,
- does not update runtime files,
- does not approve source or tool metadata,
- does not infer public readiness.

## Future Generator Requirements

A future generator must:

- be dry-run by default,
- write only with explicit confirmation,
- produce a registry diff report before writes,
- preserve hand-maintained fields,
- refuse unknown source paths,
- refuse trust or approval inference,
- update manifests only for changed mirrors,
- keep routing and tool-risk registries manually reviewed.
