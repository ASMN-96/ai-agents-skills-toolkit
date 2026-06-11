---
sourceRef: ["aider-repo-map", "openai-prompt-caching", "openai-codex-behavior-boundaries", "repomix", "toolkit-authored"]
lastExtracted: 2026-06-11
status: approved
---

# Compact Agent Context Pack

Use this method when handing work between inline agent lenses, profiles, reviewers, or future approved sub-agents.

## Required Pack Fields

- objective and non-goals
- project-map freshness result
- selected files and reason for each
- changed-file neighborhood summary
- source/method/profile references
- validation commands and expected evidence
- stop conditions
- private-overlay, secret, and product-repo exclusions
- token mode and budget rationale
- omitted context and reason
- context evidence label: `project-map`, `manual/static`, or `tool-generated`

## Token Modes

- `concise`: use for narrow tasks where the changed files, direct tests, and one or two policy/source references are enough.
- `standard`: use for normal implementation plans, PR reviews, and source reviews that need direct neighbors, validators, evals, and relevant policy records.
- `detailed`: use for high-risk audits or multi-agent planning where additional architecture, security, release, or source provenance context is necessary and explicitly justified.

## Rules

- Keep the pack compact enough that the receiving reviewer can identify scope without loading the whole repo.
- Prefer links or paths to stable docs over pasted policies.
- Include only actionable source records and methods.
- Mark tool, browser, CodeRabbit, reviewdog, source freshness, and runtime evidence as `not invoked` unless actual output exists.
- Label context evidence as `project-map` only when `.ai-toolkit/context/project-map.json` is fresh, `manual/static` when it comes from focused repo inspection, and `tool-generated` only when an approved tool actually ran and produced output.
- Repomix may be used only after scoped owner approval, even when project-owned or detected, for a scoped pack or token count; never as an automatic whole-repo dump.
- Treat whole-repo context dumping, loop agents, subagent creation, MCP setup, and global config activation as forbidden unless a later task explicitly approves a different execution mode.

## Passive Visibility

This approved method may be visible to project-sync consumers as passive governance guidance only. Approved method status does not authorize tool activation, MCP setup, external approval, runtime agent activation, product-repo indexing, generated context-pack output, or release approval.

## Forbidden Claims

- Do not say an agent, plugin, browser, Repomix, MCP server, or scanner ran unless it actually ran.
- Do not represent metadata-only records as execution.
- Do not include secrets, credentials, private overlays, or whole-repo dumps in handoff context.
