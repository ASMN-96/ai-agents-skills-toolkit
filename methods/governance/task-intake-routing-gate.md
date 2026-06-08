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
- GSD status: `not needed`, `lens only`, `selected`, `invoked`, or `blocked-unavailable`, with one-line reason.
- Superpowers status: `not needed`, `selected`, `invoked`, or `blocked-unavailable`, with one-line reason.
- Project-owned checks and validation commands to prefer first.
- Approval-required surfaces, including package files, lockfiles, CI, MCP/global config, deployment config, external services, product repos, secrets, and destructive commands.
- Stop conditions and escalation triggers.
- Out-of-scope resources, recommendations, and execution paths.

## Evidence Requirements

Report the routing decision before coding when the task is non-trivial. If the task is narrow enough to proceed directly, still keep selected tools separate from executed tools and report validation only when actual output exists.

For serious multi-step work, audits, migrations, backend/database/security/SRE work, source adoption, release programs, and cross-repo/toolkit sync, route GSD as `selected` or `invoked`. If GSD is unavailable or not physically invoked, declare the manual GSD-equivalent phase/state fallback before implementation.

For tiny tasks, GSD may be `not needed` or `lens only` when invoking it would create unnecessary planning artifacts or token overhead.

## Stop Conditions

- The affected surface is unclear and the wrong default could change production behavior, security posture, data integrity, cost, or release state.
- The request would require owner approval for package, CI, MCP/global, deployment, external service, product repo, secret, or destructive operations.
- A removed/current-scope-excluded resource is requested as an active/default recommendation.
- Validation would be claimed without current observed output.
- Serious work would silently skip both GSD and manual phase/state tracking.
