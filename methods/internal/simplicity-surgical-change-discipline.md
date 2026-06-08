---
sourceRef: ["unknown-review-required","matt-pocock-skills","nagdy-guard-skills"]
lastExtracted: 2026-06-07
status: approved
---

# Simplicity Surgical Change Discipline

## Purpose

Keep changes focused, understandable, reversible, and proportional to the user request.

## When To Use

Use before implementing, reviewing, or refactoring code.

## When Not To Use

Do not use to block necessary migrations, architecture work, or validation fixes when the requirement justifies them.

## Agent Roles That Should Embed It

Architect Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent, QA Test Agent.

## Operating Rules

State assumptions, avoid speculative abstractions, touch only necessary files, match existing style, remove only dead code created by the current change, and surface unrelated issues without editing them.

After generated or changed production code exists, run a guard pass on the diff before delivery. Check for broad error swallowing, hardcoded success paths, invented APIs, copy-from-similar mistakes, unnecessary abstractions, dead code introduced by the change, and comments that explain obvious code instead of intent.

When source-safety or registry work is in scope, keep runtime, package, CI, MCP, global-config, and product-repository boundaries explicit in the diff.

## Verification Requirements

Every changed line should trace to the request, the plan, a source-safety rule, or a verification fix. For generated-code review, report guard-pass findings as reviewer judgment unless a project-owned tool or test actually ran and output was observed.

## Risks / Anti-Patterns

Over-minimizing needed changes, hiding unresolved uncertainty, performing unrelated cleanup, or treating a small diff as proof that runtime boundaries are unaffected.

## Source Safety / License Status

Toolkit-authored cleanroom discipline with Matt Pocock source-record provenance retained for review/refactor alignment and Nagdy Guard Skills used only for normalized guard-pass concepts. License-caveated historical Karpathy source-scouting evidence is not active source authority for this method.

No upstream wording, examples, prompt structure, scripts, or runtime behavior were copied or activated.
