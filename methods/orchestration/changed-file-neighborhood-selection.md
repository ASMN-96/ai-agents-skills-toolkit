---
sourceRef: ["aider-repo-map", "openai-prompt-caching", "openai-codex-behavior-boundaries", "toolkit-authored"]
lastExtracted: 2026-06-11
status: approved
---

# Changed-File Neighborhood Selection

Use this method before audits, PR reviews, implementation planning, and agent handoffs that start from a diff or known file set.

## Purpose

Select the smallest trustworthy neighborhood around the changed files so review quality improves without whole-repo context dumping. Prefer the project map when fresh, then confirm with focused file reads.

## Selection Order

1. Changed files and directly edited docs/configs.
2. Tests, evals, validators, or generated mirrors that prove the changed behavior.
3. Fresh project-map entries: key files, source locations, test locations, config files, scripts, and validation commands.
4. Direct import/export neighbors and shared contracts.
5. Referenced methods, skills, profiles, and source records.
6. Release, security, or public/private boundary docs only when the change crosses those gates.

## Exclusion Rules

- Exclude secrets, environment files, private overlays, user-local files, logs, generated artifacts, package caches, and unrelated product repo files.
- Exclude broad registries unless the task changes routing, registry schema, source classification, or validation behavior.
- Exclude raw upstream source content unless a separate source-review task explicitly approves reading it.
- Exclude MCP setup, global config, loop agents, subagent creation, whole-repo packing, and whole-repo indexing from neighborhood selection unless a later approved execution task explicitly changes that boundary.

## Failure Modes

- Stop if the dependency direction is unclear and the task could affect security, public payloads, runtime activation, or release readiness.
- State when the selected neighborhood is static analysis only.
- Do not silently substitute a whole-repo dump for a missing or stale project map.

## Passive Visibility

This approved method may be visible to project-sync consumers as passive governance guidance only. Approved method status does not authorize tool activation, MCP setup, external approval, runtime agent activation, product-repo indexing, generated context-pack output, or release approval.
