---
sourceRef: ["aider-repo-map", "openai-prompt-caching", "openai-codex-behavior-boundaries", "toolkit-authored"]
lastExtracted: 2026-06-11
status: approved
---

# Project Context Preflight

Use this method at task start when repeated repo discovery would waste context, increase token cost, or make file targeting slower.

## Purpose

Project Context Preflight gives Codex a compact, trusted project map before broad exploration. The map is project intelligence only; Codex remains the runtime and decides what to inspect, edit, and verify.

## Required Inputs

- `.ai-toolkit/context/project-map.json` when present and fresh
- task goal and risk level
- selected toolkit agents, profiles, skills, methods, and validation commands
- current target git head and staleness hashes
- private-overlay, secret, and generated-output exclusions

## Task-Start Rules

1. Check whether `.ai-toolkit/context/project-map.json` exists and matches the current target git head.
2. If the map is stale, unsafe, or missing for a map-dependent task, stop and report the limitation before broad exploration.
3. Choose token mode: `concise`, `standard`, or `detailed`.
4. Identify likely files from `keyFiles`, `sourceLocations`, `testLocations`, `configFiles`, package scripts, and validation commands.
5. Report the selected context before expanding to broader repo search.

## Token Modes

- `concise`: key files, direct task file, and one validation command are enough.
- `standard`: key files, direct neighbors, relevant tests, validators, and one policy or method reference are needed.
- `detailed`: architecture, security, release, or source-provenance context is needed and explicitly justified.

## Prompt-Caching Layout

- Put stable toolkit/project context first.
- Put the project map summary before task-specific file excerpts.
- Put volatile user/task-specific content last.
- Do not churn static map field ordering without a schema reason.

## Hard Boundaries

- Do not dump a whole repo or whole-repo packed file into context by default.
- Do not include absolute paths, `.env` values, secrets, credentials, private overlays, raw full-file dumps, package caches, or generated build output.
- Do not install, activate, or configure external tools from map metadata.
- Do not create a new Codex runtime, looping agent, MCP setup, global config, or subagent workflow from this method.
- Do not claim Repomix, browser, graph, scanner, or validation evidence unless the approved tool actually ran and produced observed output.

## Acceptance Criteria

- The preflight report names the selected token mode and focused context.
- Every added context item has a reason tied to the task.
- Excluded private, secret, generated, and whole-repo contexts are explicit.
- Missing or stale map evidence is reported as missing or stale, not inferred.

## Passive Visibility

This method may be visible to project-sync consumers as passive governance guidance only. It does not authorize tool activation, external installs, MCP setup, subagent creation, global config changes, product-repo indexing, or release approval.
