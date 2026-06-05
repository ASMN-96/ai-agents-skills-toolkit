---
sourceRef: ["unknown-review-required"]
lastExtracted: 2026-06-05
status: approved
---

# Static Task State Handoff Ledger

## Purpose

Keep complex agent work auditable with explicit task state, handoff facts, replanning triggers, and failure accounting without adopting runtime orchestration.

## When To Use

Use for multi-step implementation, source-safety review, PR repair, validation loops, or handoff between agent lenses when work could drift or lose state.

## When Not To Use

Do not use to create a daemon, memory layer, background worker, MCP server, file watcher, package script, global config, or runtime persistence.

## Agent Roles That Should Embed It

Reviewer Agent, Architect Agent, Release Manager Agent, QA Test Agent, Skill Scout Agent.

## Required Ledger Fields

- current objective and non-goals
- current phase and next stop condition
- completed decisions and open owner decisions
- changed files and why they are in scope
- validation commands, observed results, WARN output, and skipped checks
- failures encountered, attempted fixes, and current blocker status
- handoff summary for the next reviewer or implementation pass

## Operating Rules

- Keep the ledger as plain project documentation, plan text, or review notes.
- Update state only when observed evidence changes.
- Treat failed checks and unavailable tools as first-class state.
- Replan only when a blocker, new user decision, or validation result changes the path.
- Never persist secrets, private overlays, product-repo content, hidden memory, or whole-repo dumps.

## Verification Requirements

Confirm that the final report can answer what changed, why it changed, what passed, what warned, what failed, what remains blocked, and what should happen next.

## Risks / Anti-Patterns

Silent fallback, fake progress, hidden background state, stale handoff notes, retry loops without stop conditions, and treating orchestration metadata as runtime execution.

## Source Safety / License Status

Toolkit-authored static governance method. Historical RuFlo source-safety review identified useful static concepts, but RuFlo remains `REVIEWED_HELD` and is not active source authority for this method.

RuFlo-style concepts are `held-static-only`. No memory hooks, MCP behavior, daemon logic, file watchers, package scripts, background processes, runtime persistence, source code, tests, prompts, global config, or configuration were copied or activated. Those runtime surfaces remain `forbidden-runtime`.
