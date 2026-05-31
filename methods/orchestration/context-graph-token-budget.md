---
sourceRef: ["code-review-graph"]
lastExtracted: 2026-05-31
status: draft
---

# Context Graph Token Budget

Use this method when a task is large enough that full-registry, full-repo, or full-source dumping would waste context or expose private material.

## Purpose

Token budgeting is a governance requirement. A large task must identify the smallest useful context graph before routing agents, writing plans, or reviewing diffs.

## Required Inputs

- task goal and risk level
- changed files or intended files
- selected profile and inline agent lenses
- relevant source/method/profile records
- private-overlay and secret boundaries

## Budget Rules

- Start from the changed files or explicitly requested area.
- Add only direct neighbors: imported modules, exported contracts, tests, policy docs, source records, and profile/method records that can change the decision.
- Summarize stable registries instead of pasting full JSON.
- Report the selected token mode: `concise`, `standard`, or `detailed`.
- Record what was intentionally excluded and why.

## Hard Boundaries

- Do not dump a whole repo or whole-repo graph into context.
- Do not index secrets, private overlays, credentials, tokens, cookies, environment files, or user-private paths.
- Do not activate code-review-graph, MCP, CLI, global config, hooks, background indexing, or product-repo indexing from this method.
- Do not claim graph evidence unless an approved tool actually ran and produced output.

## Acceptance Criteria

- The plan or review names the compact context pack used.
- Every added context item has a reason tied to the task.
- Private-overlay and secret exclusions are explicit.
- Missing graph evidence is reported as missing, not inferred.

## Draft Visibility

This draft method may be visible to project-sync consumers as advisory governance guidance only. Draft status does not authorize tool activation, MCP setup, external approval, runtime agent activation, product-repo indexing, generated graph output, or release approval.
