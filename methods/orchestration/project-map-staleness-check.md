---
sourceRef: ["aider-repo-map", "openai-prompt-caching", "openai-codex-behavior-boundaries", "toolkit-authored"]
lastExtracted: 2026-06-11
status: approved
---

# Project Map Staleness Check

Use this method when a task, audit, review, or handoff depends on `.ai-toolkit/context/project-map.json`.

## Staleness Signals

- map target git head differs from the current target repository head
- map staleness hashes differ from current key file hashes
- target branch is dirty, divergent, detached, or not verified when branch truth matters
- source freshness reports actionable changes
- selected toolkit assets, package scripts, validation commands, or key paths changed since the map was generated
- generated reports, docs, or compiled assets disagree with live runtime files
- map evidence came from a previous run, dry run, mock, fallback, or metadata-only record

## Required Response

- Report the stale signal before implementation, release, or broad review claims.
- Refresh through the approved project sync/update flow when possible.
- If refresh is not possible, mark the map stale and limit claims to focused static review.
- Rebuild the compact context pack after material repo, package, registry, profile, method, or validation-command changes.

## Hard Boundaries

- Do not repair stale context by installing tools, activating MCP, creating loop agents, changing global config, indexing product repos, or creating a whole-repo dump.
- Do not include private overlays, secrets, credentials, tokens, cookies, environment values, package caches, or generated build output in a refreshed map.
- Do not treat map metadata as approval to run, install, activate, extract, sync, or publish.

## Passive Visibility

This method may be visible to project-sync consumers as passive governance guidance only. It does not authorize tool activation, external installs, MCP setup, subagent creation, global config changes, product-repo indexing, or release approval.
