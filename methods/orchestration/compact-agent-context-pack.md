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
- omitted context and reason
- graph evidence label: `manual/static` or `tool-generated`

## Token Modes

- `concise`: use for narrow tasks where the changed files, direct tests, and one or two policy/source references are enough.
- `standard`: use for normal implementation plans, PR reviews, and source reviews that need direct neighbors, validators, evals, and relevant policy records.
- `detailed`: use for high-risk audits or multi-agent planning where additional architecture, security, release, or source provenance context is necessary and explicitly justified.

## Rules

- Keep the pack compact enough that the receiving reviewer can identify scope without loading the whole repo.
- Prefer links or paths to stable docs over pasted policies.
- Include only actionable source records and methods.
- Mark tool, browser, CodeRabbit, reviewdog, source freshness, and runtime evidence as `not invoked` unless actual output exists.
- Label graph evidence as `manual/static` when it comes from repo inspection or source metadata, and `tool-generated` only when an approved tool actually ran and produced output.
- Treat whole-repo context dumping and global config activation as forbidden unless a later task explicitly approves a different execution mode.

## Draft Visibility

This draft method may be visible to project-sync consumers as advisory governance guidance only. Draft status does not authorize tool activation, MCP setup, external approval, runtime agent activation, product-repo indexing, generated graph output, or release approval.

## Forbidden Claims

- Do not say an agent, plugin, browser, graph tool, MCP server, or scanner ran unless it actually ran.
- Do not represent metadata-only records as execution.
- Do not include secrets, credentials, private overlays, or whole-repo dumps in handoff context.
