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

Phase 4 agent compilation adds normalized compiled agent documents and reusable profiles only. Compiled agents summarize approved method rules into practical role-specific operating instructions. They do not duplicate full upstream method files, activate skills, create project sync scripts, overwrite project `AGENTS.md`, or modify product repositories.

## Compilation Inputs

Compiled agents are assembled from:

- `agents/*.md` modular source agent specs.
- `methods/internal/*` governance and safety methods.
- `methods/karpathy/*`, `methods/osmani/*`, `methods/matt/*`, and `methods/uiux/*` normalized method libraries.
- Toolkit governance in `AGENTS.md` and `SECURITY.md`.
- Reusable profiles under `profiles/`.

Compiled agents must include source provenance so projects can audit which toolkit files informed the output.

## Profiles

Profiles group compiled agents by operating mode such as audit, implementation, frontend, backend, UI/UX, security, SRE, or release. Profiles define included agents, support tools, allowed actions, forbidden actions, output format, and verification gates.

Profiles are not project sync instructions. They are reusable selection guidance until Phase 5 creates version-pinned sync workflows.

## Support Tools

Superpowers remains an external execution-discipline plugin. Context7, Playwright, and Figma are support tools used only when needed.
