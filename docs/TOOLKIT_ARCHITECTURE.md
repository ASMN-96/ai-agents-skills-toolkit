# Toolkit Architecture

AI Agent Skills Toolkit separates source intake, method extraction, agent definition, compilation, and project sync.

## Layers

- `sources/` stores reviewed references and source evaluation records.
- `methods/` stores approved reusable methods extracted from trusted sources. Method files are normalized and paraphrased; they are not raw upstream skills.
- `agents/` stores internal agent specifications.
- `profiles/` stores project-specific compilation context.
- `skills/` stores reviewed skill metadata and toolkit-managed skill notes.
- `compiled-agents/` stores intentional compiled outputs for project repositories.
- `install/` will store future version-pinned project sync workflows.

## Boundaries

Raw external skills and repositories do not become active automatically. Project repositories consume compiled agents, not upstream source files. Every project sync pins a toolkit version.

Phase 3 method extraction adds source records and normalized method documents only. It does not install skills, activate skills, clone external repositories, run third-party scripts, change global configuration, or create compiled agents.

## Support Tools

Superpowers remains an external execution-discipline plugin. Context7, Playwright, and Figma are support tools used only when needed.
