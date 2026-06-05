# Methods

Methods are reviewed, modular practices extracted from trusted sources or internal experience.

Method areas:

- `internal/` for toolkit-specific methods created by this project.
- `backend/` for database, API, Supabase, RLS, and migration safety gates.
- `security/` for evidence-based security review and supply-chain safety gates.
- `uiux/` for reviewed Anthropic/UIUX and interaction design methods.
- `osmani/` for reviewed Addy Osmani-style software engineering and product development methods.
- `matt/` for reviewed Matt Pocock-style TypeScript and developer experience methods.
- `karpathy/` for reviewed AI engineering and model-behavior methods.

Raw external source material does not belong here. Only reviewed and approved methods should be extracted into this directory.

Methods are passive reference material. They do not install, activate, route, or execute anything by themselves; `governance` remains the normal entrypoint for selecting agents, skills, profiles, support tools, validation, and stop conditions.

`registries/methods.registry.json` indexes method metadata for auditability. Registry entries may be referenced by routing scenarios, but they are not trigger rules, skill definitions, support-tool requirements, or activation claims.

Each method file must start with frontmatter containing:

- `sourceRef`: source-watchlist IDs that influenced the normalized method, `toolkit-authored` for cleanroom toolkit-owned methods, or `unknown-review-required` when provenance cannot be mapped safely.
- `lastExtracted`: the deterministic extraction date, or `unknown-review-required` until a compile/extraction contract records it.
- `status`: the method status mirrored from the registry, or `unknown-review-required`.

`sourceRef` is traceability for source freshness and review routing only. It does not approve importing, copying, activating, or updating external source material.
