# Embedded AI Toolkit Distribution Package

Version: 0.6.0-draft

This directory is the main toolkit repository's embedded distribution and governance package. It is not a product-repo install state and it is not a Codex runtime activation surface by itself.

Active runtime surfaces remain intentionally small:

- Repo skills: `.agents/skills/<skill>/SKILL.md`
- Project custom agents: `.codex/agents/*.toml`
- User skills: `$HOME/.agents/skills`
- Personal custom agents: `~/.codex/agents/*.toml`

No file in this package installs tools, activates external sources, configures CI, configures MCP, changes global Codex config, or imports raw upstream content.

## Source Of Truth Map

| Domain | Canonical source | Runtime copy | Distribution copy | Historical/archive | Drift control |
| --- | --- | --- | --- | --- | --- |
| skills | `skills/<skill>/SKILL.md` | .agents/skills/<skill>/SKILL.md for active runtime skills and public-safe aliases only | .ai-toolkit/skills/<skill>/SKILL.md for packaged active skills | None in this pass unless a file is explicitly marked historical | byte identity between canonical, runtime, and distribution copies |
| agents | `agents/*.md` | .codex/agents/*.toml for the five active project custom agents only | .ai-toolkit/agents/*.md for packaged agent source material | Existing non-active agent specs remain top-level documented assets | manifest hashes plus TOML field validation for active agents |
| compiled-agents | `compiled-agents/*.compiled.md` | none | .ai-toolkit/compiled-agents/*.compiled.md when packaged | Older compiled-agent versions remain explicit drift until provenance is updated | manifest hashes; no broad version restamp in this pass |
| registries | `registries/*.json` | none | .ai-toolkit/registries/*.json | none | byte identity for mirrored registry files |
| methods | `methods/**` | none | .ai-toolkit/methods/** | restricted or historical sources remain marked in provenance | manifest hashes and source-provenance validation |
| sources | `sources/*.md and sources/source-watchlist.json` | none | .ai-toolkit/sources/** | restricted/reference-only source records stay explicitly marked | neverAutoImport plus source-record and watchlist validation |
| profiles | `profiles/*.md` | none | not emitted in the current embedded package; profile registry mirror remains packaged | older profile notes only if marked | top-level profile files plus registry reference validation |
| evals | `evals/**` | none | .ai-toolkit/evals/** | none | JSON parse and expected routing-case validation |
| scripts | `scripts/*.mjs and scripts/ai-toolkit/*.mjs` | none | .ai-toolkit/scripts-manifest.json metadata only | old scripts remain top-level until a later cleanup PR | command allowlist, unsafe-command scan, and manifest hashes |

## Approval Boundaries

- Registries are metadata only.
- Tool records are source-intelligence only.
- Source watchlist entries always use `neverAutoImport: true`.
- Active runtime is limited to ten reviewed skills and five project custom agents.
- Helper skills remain internal and must not be copied into active runtime paths.
- Top-level folders remain canonical and are not deleted, relocated, or flattened in this pass.

## Validation

Run from the repository root:

- `node scripts/validate-toolkit.mjs`
- `node scripts/scan-public-private-leaks.mjs --output docs/PUBLIC_PRIVATE_LEAK_REPORT.md`
- `node scripts/ai-toolkit/validate-ai-toolkit.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `node scripts/ai-toolkit/validate-version-consistency.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/check-source-freshness.mjs --fail-on-change`
- `node scripts/ai-toolkit/check-source-freshness.mjs --mock`
- `node scripts/ai-toolkit/run-quality-gate.mjs --mode fast-local --dry-run`
