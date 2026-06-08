---
sourceRef: ["nagdy-guard-skills"]
lastExtracted: 2026-06-07
status: approved
---

# Documentation Accuracy Guard

## Purpose

Treat technical documentation as verifiable claims about the repository instead of prose generated from memory.

## When To Use

Use when writing or reviewing READMEs, API docs, docstrings, changelogs, tutorials, config examples, command references, or generated docs that mention concrete code behavior.

## When Not To Use

Do not use for marketing copy, visual site theming, or docs changes that make no technical claims.

## Agent Roles That Should Embed It

Reviewer Agent, QA Test Agent, Product Agent, Backend Contract Agent, Frontend Agent.

## Operating Rules

- Verify every referenced symbol, file path, command, flag, endpoint, config key, environment variable, and API shape against the source, schema, route table, CLI help, or current docs.
- Document actual behavior, not intended behavior; if code and docs disagree, flag the mismatch instead of silently choosing one.
- Remove unverifiable scale, performance, compatibility, and production-readiness claims unless they have repository evidence.
- Keep code samples runnable on a clean machine without local paths, real credentials, or hidden prior state.
- When code behavior changes, search related docs for the old symbol, flag, route, or behavior and update all affected surfaces in the same scoped change.
- Do not paraphrase external documentation as local truth; link to upstream docs and describe only how this project uses the external dependency.

## Verification Requirements

For docs updates, report which claim surfaces were checked and what evidence was used. If samples, commands, or links were not executed or verified, label that gap explicitly.

## Risks / Anti-Patterns

Hallucinated function names, stale flags, broken examples, unsupported compatibility claims, docstrings that restate signatures, and documentation updates that drift from actual code.

## Source Safety / License Status

Toolkit-authored cleanroom method inspired by Nagdy Guard Skills docs-review concepts. No upstream wording, examples, prompt structure, scripts, reference files, or runtime behavior were copied or activated.
