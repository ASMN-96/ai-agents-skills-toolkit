---
sourceRef: ["code-review-graph"]
lastExtracted: 2026-05-31
status: draft
---

# Compact Agent Context Pack

Use this method when handing work between inline agent lenses, profiles, reviewers, or future approved sub-agents.

## Required Pack Fields

- objective and non-goals
- selected files and reason for each
- changed-file neighborhood summary
- source/method/profile references
- validation commands and expected evidence
- stop conditions
- private-overlay, secret, and product-repo exclusions
- token mode and budget rationale

## Rules

- Keep the pack compact enough that the receiving reviewer can identify scope without loading the whole repo.
- Prefer links or paths to stable docs over pasted policies.
- Include only actionable source records and methods.
- Mark tool, browser, CodeRabbit, reviewdog, source freshness, and runtime evidence as `not invoked` unless actual output exists.
- Treat whole-repo context dumping and global config activation as forbidden unless a later task explicitly approves a different execution mode.

## Forbidden Claims

- Do not say an agent, plugin, browser, graph tool, MCP server, or scanner ran unless it actually ran.
- Do not represent metadata-only records as execution.
- Do not include secrets, credentials, private overlays, or whole-repo dumps in handoff context.
