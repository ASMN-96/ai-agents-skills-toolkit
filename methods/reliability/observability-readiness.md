---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# Observability Readiness

## Purpose

Ensure coding-time changes leave enough evidence for debugging without leaking secrets, private data, or unsupported production claims.

## Required Checks

- Identify important failure points, user-visible errors, retry boundaries, background work, external calls, and state transitions.
- Prefer clear application errors and project-owned logs over new monitoring dependencies.
- Keep logs safe: no secrets, tokens, cookies, private payloads, tenant data, credentials, or raw PII.
- Document how a future maintainer can detect failure: command output, test failure, log message, status code, trace ID, or manual reproduction.
- Separate local/debug evidence from production observability claims.

## Evidence Requirements

Report observed logs, errors, traces, metrics, screenshots, or command output only when actually collected. Label unavailable or skipped observability evidence.

## Stop Conditions

- Debugging would require secret access or private data exposure.
- New observability service, deployment config, CI wiring, package install, or external permission is required without approval.
- Release readiness depends on unobserved monitoring behavior.
