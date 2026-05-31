---
sourceRef: ["code-review-graph"]
lastExtracted: 2026-05-31
status: draft
---

# Stale Context Graph Detection

Use this method when an audit, plan, or review depends on graph-like context that may have changed.

## Staleness Signals

- local branch is stale, dirty, divergent, detached, or not verified against remote
- source freshness reports actionable changes
- registry, profile, method, or embedded package mirrors drift
- changed files are not represented in the selected context pack
- generated reports or docs disagree with live runtime files
- graph evidence came from a previous run, dry run, mock, fallback, or metadata-only record

## Required Response

- Report the stale signal before implementation or release claims.
- Refresh through approved read-only commands when possible.
- If refresh is not possible, mark the context graph as stale and limit claims to static review.
- Rebuild the compact context pack after material changes.

## Hard Boundaries

- Do not repair stale context by activating MCP, running code-review-graph, indexing product repos, changing global config, or dumping the whole-repo context.
- Do not include private overlays, secrets, credentials, tokens, cookies, or environment values in a refreshed graph.
- Do not treat source metadata as approval to extract, install, activate, or sync.
