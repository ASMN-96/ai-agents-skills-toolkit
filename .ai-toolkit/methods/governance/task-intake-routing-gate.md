---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-06-07
status: approved
---

# Task Intake Routing Gate

## Purpose

Classify normal-language user requests before coding so implementation starts with explicit scope, affected surfaces, agent/skill/method/tool routing, validation gates, stop conditions, and out-of-scope items.

## When To Use

Use before implementation, PR repair, release preparation, source adoption, security review, mobile/WebView work, package/tooling requests, or any task where the user describes intent in business or product language rather than exact files.

## Required Classification

- Requested outcome and non-goals.
- Affected surfaces: UI, API, database, auth, security, performance, mobile, WebView, CI, release, docs, toolkit metadata, or external source safety.
- Required agents, skills, methods, profiles, and support tools.
- Project-owned checks and validation commands to prefer first.
- Approval-required surfaces, including package files, lockfiles, CI, MCP/global config, deployment config, external services, product repos, secrets, and destructive commands.
- Stop conditions and escalation triggers.
- Out-of-scope resources, recommendations, and execution paths.

## Evidence Requirements

Report the routing decision before coding when the task is non-trivial. If the task is narrow enough to proceed directly, still keep selected tools separate from executed tools and report validation only when actual output exists.


GSD and Superpowers are optional at every task size. Use a specific workflow when requested or materially useful; do not require framework status reports or equivalent fallback declarations.

## Validation Tier Routing

Apply the first matching rule below. Mixed work uses the highest applicable tier.

1. An explicit request to verify actual release readiness uses the high-risk/release tier, including documented backend checks.
2. Otherwise, an inspection-only question or audit inspects relevant evidence and uses focused diagnostics when needed. It does not imply application or release verification.
3. Changes to authentication, authorization, tenant isolation or RLS, migrations, payments, security controls, production deployment, correctness-sensitive concurrency, or security assertions and fixtures use high-risk/release checks and independent boundary review.
4. Changes to application code, tests, executable configuration, build tooling, generated contracts, or agent-routing behavior use behavior/code checks for the affected system.
5. Changes limited to prose, links, or non-executable documentation use documentation checks. Documentation that changes an executable or generated contract moves to behavior/code.

An otherwise unclassified executable change defaults to behavior/code. Changes to `AGENTS.md`, skills, or Codex routing receive instruction and runtime checks, but do not automatically trigger an unrelated application suite.

## Stop Conditions

- The affected surface is unclear and the wrong default could change production behavior, security posture, data integrity, cost, or release state.
- Existing authorization does not cover the required package, CI, MCP/global, deployment, external service, product repo, secret, or destructive operations.
- A removed/current-scope-excluded resource is requested as an active/default recommendation.
- Validation would be claimed without current observed output.
- A specifically selected workflow cannot run and its required state or evidence cannot be preserved safely.
