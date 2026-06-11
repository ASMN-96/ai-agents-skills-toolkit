# code-review-graph Source Record

- Source name: code-review-graph
- Repository: tirth8205/code-review-graph
- Source URL: https://github.com/tirth8205/code-review-graph
- Homepage: https://code-review-graph.com
- Last reviewed commit: b72413cbd34a4ac08cc60dcdd42df1d02f3fc77d
- Last reviewed date: 2026-06-11
- Review level: completed source-safety review for active-read-only metadata
- Classification: active-read-only source intelligence
- License status: MIT signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; not runtime-approved
- neverAutoImport: true

## Toolkit Value

code-review-graph is useful as reference material for context-graph and token-budget governance. The toolkit-owned usage is limited to static planning methods for changed-file neighborhood selection, compact agent context packs, stale graph detection, and token budget reporting.

## Reviewed Evidence

- License signal: GitHub repository metadata and the reviewed package metadata report MIT at `0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8`.
- Source trust signal: public, non-fork, non-archived repository; still external and not imported.
- Maintenance signal: reviewed commit was committed on 2026-05-25; repository metadata showed recent activity during the 2026-06-05 review.
- Install behavior: Python package metadata exposes CLI entrypoints and optional extras; no install is approved by this source record.
- CLI behavior: reviewed tree includes commands for install/init, build/update/watch, MCP serving, repository registration, daemon management, graph visualization, wiki generation, and evaluation.
- MCP behavior: reviewed tree includes MCP configuration and serve/mcp command surfaces; MCP setup remains approval-required.
- Indexing behavior: reviewed tree includes graph build, incremental update, FTS, community/flow processing, and daemon/watch behavior; indexing remains approval-required.
- Network behavior: toolkit metadata sends no data externally; upstream includes MCP/HTTP serving and optional network-capable integrations, so any execution requires separate owner approval.
- Secret and data exposure risk: running or indexing against a product repo could capture source, paths, private overlays, secrets, or sensitive architecture; product-repo scanning and private-overlay indexing are forbidden without approval.
- Filesystem writes: reviewed behavior can create graph databases, local config, logs, generated graph/wiki/visualization output, platform instructions, hooks, and daemon state; no write behavior is approved by registry presence.
- Global config risk: reviewed behavior includes platform and MCP configuration paths; global/user config changes remain forbidden without approval.
- Prompt-injection risk: upstream repository includes docs, prompts/instructions, skills, generated examples, and review-assistant surfaces; use only normalized toolkit-owned guidance.
- Dangerous command risk: install/init, hooks, daemon, watchers, subprocess/git use, package scripts, MCP servers, and package-manager flows are high-risk unless separately reviewed and approved.

## Already Used

- `methods/orchestration/context-graph-token-budget.md`
- `methods/orchestration/changed-file-neighborhood-selection.md`
- `methods/orchestration/compact-agent-context-pack.md`
- `methods/orchestration/stale-context-graph-detection.md`
- `docs/SOURCE_UTILIZATION_MATRIX.md`
- token-efficiency eval cases

## Active-Read-Only Boundary

The active-read-only classification means source intelligence and manual/static planning reference only. It does not authorize:

- import, extraction, installation, activation, or package changes;
- CLI, MCP, daemon, hook, watcher, HTTP, VS Code extension, or background process use;
- CI wiring, project-local config, MCP config, global/user config, or deployment config changes;
- product-repo indexing, private-overlay indexing, whole-repo context dumping, or generated graph output claims;
- copying raw upstream code, prompts, scripts, package config, generated output, examples, docs, or runtime behavior;
- evidence claims unless actual approved output exists and is named as such.

## Approval Required Before Any Execution

Owner approval is required before any install, run, indexing, MCP setup, package/project change, CI wiring, product repo scan, private overlay scan, global config change, generated graph output, or external integration use.

## Extraction Rule

Only normalized toolkit governance ideas may be used. Do not copy upstream code, prompts, scripts, package config, generated output, examples, docs, or runtime behavior into this repository.

## v0.2.3 Full-Power Resolution 2026-06-06

Outcome: `SYNCED_ADOPTED`.

code-review-graph remains active inside the embedded toolkit as read-only source intelligence for changed-file neighborhoods, compact context packs, stale graph detection, and token-budget governance. This does not authorize CLI execution, MCP setup, daemon/watch behavior, product-repo indexing, global config changes, package changes, generated graph claims, or whole-repo dumps without separate approval and observed output.

## Freshness Review 2026-06-11

Skill Scout read-only follow-up reviewed upstream default-branch movement from `0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8` to `b72413cbd34a4ac08cc60dcdd42df1d02f3fc77d` using `git ls-remote` and GitHub compare metadata only. The compare was 29 commits ahead and touched GitHub Action, daemon, embedding provider, Windows path handling, custom-language support, eval/benchmark code, hook files, skills, docs, package metadata, workflow files, and tests.

Outcome: `SYNCED_ADOPTED`.

Decision: keep code-review-graph adopted only as static context-graph and token-governance source intelligence already represented in toolkit-owned methods. This refresh updates embedded source tracking only and does not approve CLI install, GitHub Action adoption, MCP setup, daemon/watch behavior, hook adoption, product-repo indexing, private-overlay indexing, generated graph claims without observed output, package or lockfile adoption, raw upstream copying, or runtime activation.
