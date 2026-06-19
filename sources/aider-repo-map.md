# Aider Repo Map Source Record

- Source name: Aider repo map
- Source URL: https://aider.chat/docs/repomap.html
- Source type: official documentation
- Last reviewed date: 2026-06-19
- Review level: method-design reference
- Classification: active-method source for compact project navigation
- License status: documentation reference only; no raw source, prompt, script, or generated output copied
- Maintenance signal: live official Aider documentation reviewed for repo-map concept
- neverAutoImport: true

## Toolkit Value

Aider's repo-map concept is useful as the primary design model for compact repo navigation: provide a small map of important files, symbols, and relationships so the agent can select focused context without whole-repo dumping.

## Adopted Guidance

- Use a compact project map to orient before broad exploration.
- Prefer high-signal paths, package metadata, scripts, validation commands, tests, and directly relevant neighborhoods over full repository context.
- Treat the map as an orientation aid that must be refreshed when stale.

## Boundaries

- Do not copy Aider code, prompts, templates, examples, or generated repo maps.
- Do not install, run, configure, or depend on Aider from this toolkit feature.
- Do not claim Aider output unless Aider was separately approved, run, and observed.
- Do not use repo-map guidance to justify whole-repo dumps, private-overlay indexing, `.env` reads, or generated build-output packing.

## Used By

- `methods/orchestration/project-context-preflight.md`
- `methods/orchestration/project-map-staleness-check.md`
- `methods/orchestration/changed-file-neighborhood-selection.md`
- `methods/orchestration/compact-agent-context-pack.md`

## Manual Review 2026-06-19

Manual review checked the current Aider repo-map page. The compact file/symbol map and token-budget selection model remain relevant to project-context preflight. This record remains reference-only and does not approve Aider install, execution, generated map claims, or raw docs/code copying.
